const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.setting.findMany();
  console.log('=== SETTINGS IN DB ===');
  settings.forEach(s => {
    if (s.key.includes('video') || s.key.includes('home')) {
      console.log(`${s.key}: "${s.value}"`);
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
