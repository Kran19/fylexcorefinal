import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function clearUploadsDirectory() {
  const uploadsDir = path.join(__dirname, '../uploads');
  if (fs.existsSync(uploadsDir)) {
    try {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = path.join(uploadsDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
      console.log('🧹 Cleaned all uploaded files from /uploads directory.');
    } catch (e) {
      console.error('⚠️ Could not clear some uploads files:', e);
    }
  }
}

async function main() {
  console.log('🌱 Initializing clean database with admin credentials only...');

  clearUploadsDirectory();

  const adminPassword = 'fylex@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.admin.upsert({
    where: { email: 'admin@fylex.com' },
    update: { password: hashedPassword, name: 'Fylex Admin', status: 1 },
    create: { name: 'Fylex Admin', email: 'admin@fylex.com', password: hashedPassword, role: 'admin', status: 1 },
  });

  await prisma.admin.upsert({
    where: { email: 'admin@gmail.com' },
    update: { password: hashedPassword, name: 'Primary Admin', status: 1 },
    create: { name: 'Primary Admin', email: 'admin@gmail.com', password: hashedPassword, role: 'admin', status: 1 },
  });

  console.log('✅ Administrative accounts initialized.');
  console.log('🔑 Email: admin@fylex.com | Password: fylex@123');
  console.log('🔑 Email: admin@gmail.com | Password: fylex@123');
}

main()
  .catch((e) => {
    console.error('❌ Error during admin seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
