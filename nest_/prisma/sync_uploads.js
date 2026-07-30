/**
 * FYLEX SERVER UPLOADS SYNC SCRIPT (ENHANCED VARIANT PAIRING)
 * Scans uploads/ and uploads/optimized/webp/ directories and ensures
 * PostgreSQL Media and MediaVariant records match EXACT physical filenames on disk.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function syncUploads() {
  console.log('🔍 Starting comprehensive disk & database media sync...');
  const uploadsDir = path.join(__dirname, '../uploads');
  const webpDir = path.join(uploadsDir, 'optimized', 'webp');

  if (!fs.existsSync(uploadsDir)) {
    console.log('⚠️ Uploads directory does not exist:', uploadsDir);
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  let synced = 0;
  let variantsUpdated = 0;

  // STEP 1: Ensure all physical files in uploads/ are in Media table
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

    let media = await prisma.media.findFirst({
      where: {
        OR: [
          { fileName: fileName },
          { filePath: relPath }
        ]
      }
    });

    if (!media) {
      media = await prisma.media.create({
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
      synced++;
      console.log(`✅ Registered missing media #${media.id}: ${fileName}`);
    }
  }

  // STEP 2: Match every Media entity with actual .webp variant files present on disk
  if (fs.existsSync(webpDir)) {
    const variantFiles = fs.readdirSync(webpDir);
    const allMedia = await prisma.media.findMany({
      include: { variants: true }
    });

    for (const media of allMedia) {
      // Look for any WebP file starting with `${media.id}_`
      const matchingFile = variantFiles.find(vf => vf.startsWith(`${media.id}_`) && vf.endsWith('.webp'));
      if (matchingFile) {
        const fullVariantPath = path.join(webpDir, matchingFile);
        const varStat = fs.statSync(fullVariantPath);
        const relVariantPath = `/uploads/optimized/webp/${matchingFile}`;
        const savedRatio = Number(media.fileSize) > 0 ? (((Number(media.fileSize) - varStat.size) / Number(media.fileSize)) * 100) : 0;

        // Check if existing variant matches exact filename on disk
        const existingVariant = media.variants.find(v => v.format === 'webp');
        if (existingVariant) {
          if (existingVariant.filePath !== relVariantPath || Number(existingVariant.fileSize) !== varStat.size) {
            await prisma.mediaVariant.update({
              where: { id: existingVariant.id },
              data: {
                filePath: relVariantPath,
                fileSize: varStat.size,
                compressionRatio: Math.max(0, savedRatio)
              }
            });
            variantsUpdated++;
            console.log(`🔄 Corrected variant path for media #${media.id} ➔ ${matchingFile}`);
          }
        } else {
          await prisma.mediaVariant.create({
            data: {
              mediaId: media.id,
              format: 'webp',
              preset: 'balanced',
              quality: 80,
              filePath: relVariantPath,
              fileSize: varStat.size,
              compressionRatio: Math.max(0, savedRatio)
            }
          });
          variantsUpdated++;
          console.log(`✨ Created missing variant record for media #${media.id} ➔ ${matchingFile}`);
        }

        // Ensure serveMode is auto
        if (media.serveMode !== 'auto') {
          await prisma.media.update({
            where: { id: media.id },
            data: { serveMode: 'auto' }
          });
        }
      }
    }
  }

  console.log(`\n✨ MEDIA & VARIANT SYNC FINISHED: ${synced} new media registered, ${variantsUpdated} WebP variant paths paired to disk files.`);
}

syncUploads()
  .catch(e => console.error('❌ Sync failed:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
