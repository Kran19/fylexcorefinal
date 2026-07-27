const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function debugMedia() {
  console.log('🔍 === MEDIA DIAGNOSTIC SCRIPT ===');
  
  const mediaDir = '/app/uploads';
  console.log(`📁 Uploads Directory: ${mediaDir}`);
  
  if (!fs.existsSync(mediaDir)) {
    console.error(`❌ ERROR: Directory ${mediaDir} DOES NOT EXIST!`);
    return;
  }

  const diskFiles = fs.readdirSync(mediaDir);
  console.log(`📂 Disk Files Count in ${mediaDir}: ${diskFiles.length}`);
  console.log(`  Sample disk files:`, diskFiles.slice(0, 10));

  const dbMedia = await prisma.media.findMany();
  console.log(`📊 DB Media Records Count: ${dbMedia.length}`);

  let matchCount = 0;
  let missingCount = 0;

  for (const m of dbMedia) {
    const cleanFileName = m.fileName ? m.fileName.replace(/^uploads\//, '') : '';
    const cleanFilePath = m.filePath ? m.filePath.replace(/^uploads\//, '') : '';

    const pathByName = path.join(mediaDir, cleanFileName);
    const pathByPath = path.join(mediaDir, cleanFilePath);

    const existsByName = cleanFileName && fs.existsSync(pathByName);
    const existsByPath = cleanFilePath && fs.existsSync(pathByPath);

    if (existsByName || existsByPath) {
      matchCount++;
    } else {
      missingCount++;
      console.log(`⚠️ MISSING DISK FILE for DB ID #${m.id}:`);
      console.log(`   Original Name: "${m.originalFilename}"`);
      console.log(`   fileName:      "${m.fileName}" -> Exists? ${existsByName}`);
      console.log(`   filePath:      "${m.filePath}" -> Exists? ${existsByPath}`);
      console.log(`   folderPath:    "${m.folderPath}"`);
    }
  }

  console.log('\n📊 === DIAGNOSTIC SUMMARY ===');
  console.log(`✅ Media in DB that EXISTS on Disk: ${matchCount}`);
  console.log(`❌ Media in DB MISSING on Disk:     ${missingCount}`);
  
  if (missingCount > 0) {
    console.log('\n💡 RECOMMENDATION:');
    console.log('   The database records refer to files that do not exist in /app/uploads on disk.');
    console.log('   Run: scp -r nest_/uploads/* root@srv1558204:/home/fylex/nest_/uploads/');
  }
}

debugMedia()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
