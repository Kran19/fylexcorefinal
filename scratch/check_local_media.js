const { PrismaClient } = require('../nest_/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const media = await prisma.media.findMany({
    include: { variants: true }
  });
  console.log('--- LOCALHOST POSTGRESQL DB AUDIT ---');
  console.log('TOTAL MEDIA RECORDS IN DB:', media.length);
  media.forEach(m => {
    console.log(`ID: ${m.id} | Name: ${m.fileName} | Variants: ${m.variants.length} | ServeMode: ${m.serveMode}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
