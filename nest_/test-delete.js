const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const media = await prisma.media.findMany({ take: 1 });
    if (media.length === 0) { console.log('No media to delete'); return; }
    console.log('Trying to delete media id:', media[0].id);
    await prisma.media.delete({ where: { id: media[0].id } });
    console.log('Deleted successfully!');
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
