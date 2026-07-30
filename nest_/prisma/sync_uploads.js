/**
 * FYLEX SERVER UPLOADS SYNC SCRIPT
 * Scans uploads/ directory and ensures every physical file on disk 
 * is registered in PostgreSQL Media and MediaVariant tables.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function syncUploads() {
  console.log('🔍 Scanning uploads directory for media files...');
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('⚠️ Uploads directory does not exist:', uploadsDir);
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  let synced = 0;
  let skipped = 0;

  for (const fileName of files) {
    if (fileName === 'optimized' || fileName === 'archive' || fileName.startsWith('.')) continue;

    const fullPath = path.join(uploadsDir, fileName);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    const isVideo = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext);
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(ext);

    if (!isImage && !isVideo) continue;

    const relPath = `uploads/${fileName}`;

    // Check if media already exists
    const existing = await prisma.media.findFirst({
      where: {
        OR: [
          { fileName: fileName },
          { filePath: relPath }
        ]
      }
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Register missing media
    const media = await prisma.media.create({
      data: {
        originalFilename: fileName,
        fileName: fileName,
        filePath: relPath,
        mimeType: isVideo ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        extension: ext,
        fileSize: stat.size,
        disk: 'local',
        fileType: isVideo ? 'video' : 'image',
        folderPath: '/'
      }
    });

    // Check if optimized variant exists
    const webpPath = path.join(uploadsDir, 'optimized', 'webp');
    if (fs.existsSync(webpPath)) {
      const variantFiles = fs.readdirSync(webpPath);
      const matchingVariant = variantFiles.find(vf => vf.startsWith(`${media.id}_`));
      if (matchingVariant) {
        const varStat = fs.statSync(path.join(webpPath, matchingVariant));
        const savedRatio = stat.size > 0 ? (((stat.size - varStat.size) / stat.size) * 100) : 0;

        await prisma.mediaVariant.create({
          data: {
            mediaId: media.id,
            format: 'webp',
            preset: 'balanced',
            quality: 80,
            filePath: `/uploads/optimized/webp/${matchingVariant}`,
            fileSize: varStat.size,
            compressionRatio: Math.max(0, savedRatio)
          }
        }).catch(() => {});
      }
    }

    synced++;
    console.log(`✅ Synced asset #${media.id}: ${fileName} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  console.log(`\n✨ UPLOADS SYNC COMPLETED: ${synced} new assets registered, ${skipped} existing assets verified.`);
}

syncUploads()
  .catch(e => console.error('❌ Sync failed:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
