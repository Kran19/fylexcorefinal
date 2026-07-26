const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const belts = await prisma.belt.findMany({
    include: { image: true }
  });
  console.log(`=== BELTS (${belts.length}) ===`);
  for (const b of belts) {
    console.log(`Belt: "${b.name}" (ID: ${b.id})`);
    console.log(`  imageId: ${b.imageId}`);
    console.log(`  image:`, b.image ? JSON.stringify(b.image) : 'null');
  }

  const boxes = await prisma.box.findMany({
    include: { image: true }
  });
  console.log(`=== BOXES (${boxes.length}) ===`);
  for (const b of boxes) {
    console.log(`Box: "${b.name}" (ID: ${b.id})`);
    console.log(`  imageId: ${b.imageId}`);
    console.log(`  image:`, b.image ? JSON.stringify(b.image) : 'null');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
