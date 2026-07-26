import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️ Deleting old products...');
  const result = await prisma.product.deleteMany();
  console.log(`✅ Deleted ${result.count} products.`);
  
  const resultMedia = await prisma.media.deleteMany();
  console.log(`✅ Deleted ${resultMedia.count} media.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
