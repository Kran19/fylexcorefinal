import { PrismaClient } from '@prisma/client';
import { EARLY_BIRD_MOBILES_SET } from './modules/marketing/early-bird-mobiles';

const prisma = new PrismaClient();

async function main() {
  console.log(`Starting Early Bird credit seeding for ${EARLY_BIRD_MOBILES_SET.size} mobile numbers...`);

  // Get active loyalty program or any existing loyalty program
  let program = await prisma.loyaltyProgram.findFirst({ where: { status: 1 } });
  if (!program) {
    program = await prisma.loyaltyProgram.findFirst();
  }

  if (!program) {
    console.log('No LoyaltyProgram found in database. Creating default active LoyaltyProgram...');
    program = await prisma.loyaltyProgram.create({
      data: {
        name: 'Fylex Rewards',
        slug: 'fylex-rewards',
        description: 'Fylex Default Loyalty Program',
        status: 1,
      }
    });
  }

  console.log(`Using Loyalty Program ID: ${program.id}`);

  // Fetch all customers
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      mobile: true,
      name: true,
      email: true,
      loyalties: {
        where: {
          loyaltyProgramId: program.id,
        },
        include: {
          transactions: true,
        }
      }
    }
  });

  console.log(`Found ${customers.length} total customers in database.`);

  let matchedCount = 0;
  let newlyGrantedCount = 0;
  let alreadyHadCreditsCount = 0;

  for (const customer of customers) {
    if (!customer.mobile) continue;

    // Clean mobile number (strip non-digits, take last 10 digits)
    const cleanDigits = customer.mobile.replace(/\D/g, '');
    const tenDigits = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    if (EARLY_BIRD_MOBILES_SET.has(tenDigits)) {
      matchedCount++;
      const existingLoyalty = customer.loyalties[0];

      if (existingLoyalty) {
        // Check if Early Bird bonus was already added
        const hasEarlyBirdTx = existingLoyalty.transactions.some(tx => 
          tx.notes && tx.notes.includes('Early Bird')
        );

        if (hasEarlyBirdTx) {
          console.log(`Customer ID ${customer.id} (${customer.mobile}) already has Early Bird credits.`);
          alreadyHadCreditsCount++;
        } else {
          // Increment existing loyalty points by 500
          const updatedAvailable = (existingLoyalty.availablePoints || 0) + 500;
          const updatedTotal = (existingLoyalty.totalPoints || 0) + 500;

          await prisma.customerLoyalty.update({
            where: { id: existingLoyalty.id },
            data: {
              availablePoints: updatedAvailable,
              totalPoints: updatedTotal,
            }
          });

          await prisma.loyaltyTransaction.create({
            data: {
              customerLoyaltyId: existingLoyalty.id,
              customerId: customer.id,
              type: 'earning',
              points: 500,
              balance: updatedAvailable,
              notes: 'Early Bird Welcome Bonus - 500 Free Fylex Credits',
            }
          });

          console.log(`Granted 500 Early Bird credits to existing loyalty user ID ${customer.id} (${customer.mobile}). New balance: ${updatedAvailable}`);
          newlyGrantedCount++;
        }
      } else {
        // Create new CustomerLoyalty with 500 points
        const newLoyalty = await prisma.customerLoyalty.create({
          data: {
            customerId: customer.id,
            loyaltyProgramId: program.id,
            availablePoints: 500,
            totalPoints: 500,
            usedPoints: 0,
          }
        });

        await prisma.loyaltyTransaction.create({
          data: {
            customerLoyaltyId: newLoyalty.id,
            customerId: customer.id,
            type: 'earning',
            points: 500,
            balance: 500,
            notes: 'Early Bird Welcome Bonus - 500 Free Fylex Credits',
          }
        });

        console.log(`Created new loyalty account & granted 500 Early Bird credits to user ID ${customer.id} (${customer.mobile}).`);
        newlyGrantedCount++;
      }
    }
  }

  console.log('\n=== EARLY BIRD SEEDING COMPLETED ===');
  console.log(`Total Early Bird list size: ${EARLY_BIRD_MOBILES_SET.size}`);
  console.log(`Matched existing customers: ${matchedCount}`);
  console.log(`Newly granted 500 credits: ${newlyGrantedCount}`);
  console.log(`Already had Early Bird credits: ${alreadyHadCreditsCount}`);
  console.log(`Future signups pending: ${EARLY_BIRD_MOBILES_SET.size - matchedCount} (will automatically get 500 credits when registering)`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error seeding Early Bird credits:', err);
  process.exit(1);
});
