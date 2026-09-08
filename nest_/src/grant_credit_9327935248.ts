import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetMobile = '9327935248';
  console.log(`Granting 500 FYLEX Credits to mobile: ${targetMobile}...`);

  // Find active loyalty program
  let program = await prisma.loyaltyProgram.findFirst({ where: { status: 1 } });
  if (!program) {
    program = await prisma.loyaltyProgram.findFirst();
  }
  if (!program) {
    program = await prisma.loyaltyProgram.create({
      data: {
        name: 'Fylex Rewards',
        slug: 'fylex-rewards',
        description: 'Fylex Default Loyalty Program',
        status: 1,
      }
    });
  }

  // Find customer with matching mobile number
  let customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { mobile: targetMobile },
        { mobile: `+91${targetMobile}` },
        { mobile: `91${targetMobile}` },
        { mobile: { endsWith: targetMobile } }
      ]
    }
  });

  if (!customer) {
    console.log(`Customer with mobile ${targetMobile} not registered yet. Creating customer record...`);
    customer = await prisma.customer.create({
      data: {
        name: 'Fylex Early Bird Member',
        email: `member_${targetMobile}@fylex.com`,
        mobile: targetMobile,
        status: 1,
        isBlock: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
  }

  console.log(`Found/Created Customer ID: ${customer.id} (${customer.name}, Mobile: ${customer.mobile})`);

  let loyalty = await prisma.customerLoyalty.findFirst({
    where: { customerId: customer.id }
  });

  if (!loyalty) {
    loyalty = await prisma.customerLoyalty.create({
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
        customerLoyaltyId: loyalty.id,
        customerId: customer.id,
        type: 'earning',
        points: 500,
        balance: 500,
        notes: 'Early Bird Welcome Bonus - 500 Free Fylex Credits',
        createdAt: new Date(),
      }
    });

    console.log(`SUCCESS: Created new loyalty account for Customer ID ${customer.id} with 500 FYLEX Credits.`);
  } else {
    const updatedAvailable = Number(loyalty.availablePoints || 0) + 500;
    const updatedTotal = Number(loyalty.totalPoints || 0) + 500;

    await prisma.customerLoyalty.update({
      where: { id: loyalty.id },
      data: {
        availablePoints: updatedAvailable,
        totalPoints: updatedTotal,
      }
    });

    await prisma.loyaltyTransaction.create({
      data: {
        customerLoyaltyId: loyalty.id,
        customerId: customer.id,
        type: 'earning',
        points: 500,
        balance: updatedAvailable,
        notes: 'Early Bird Welcome Bonus - 500 Free Fylex Credits',
        createdAt: new Date(),
      }
    });

    console.log(`SUCCESS: Updated Customer ID ${customer.id} (${customer.mobile}) loyalty account. New Available Balance: ${updatedAvailable} FYLEX Credits.`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error granting credits:', err);
  process.exit(1);
});
