import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditData() {
  const totalProducts = await prisma.product.count();
  const allProducts = await prisma.product.findMany({
    include: {
      productMedia: { include: { media: { include: { variants: true } } } },
      variants: { include: { variantImages: { include: { media: { include: { variants: true } } } } } }
    }
  });

  let pmOnly = 0;
  let jsonOnly = 0;
  let both = 0;
  let neither = 0;
  let brokenRefs = 0;
  let missingWebp = 0;

  const allMediaIds = new Set((await prisma.media.findMany({ select: { id: true } })).map(m => m.id));
  const optimizedMediaIds = new Set((await prisma.media.findMany({ where: { OR: [{ isOptimized: true }, { serveMode: 'auto' }] }, select: { id: true } })).map(m => m.id));

  for (const p of allProducts) {
    const hasPm = p.productMedia && p.productMedia.length > 0;
    let hasJson = false;
    if (p.images) {
      try {
        const parsed = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        if (Array.isArray(parsed) && parsed.length > 0) hasJson = true;
      } catch (e) {}
    }
    if (p.heroImage) hasJson = true;

    if (hasPm && hasJson) both++;
    else if (hasPm && !hasJson) pmOnly++;
    else if (!hasPm && hasJson) jsonOnly++;
    else neither++;

    for (const pm of (p.productMedia || [])) {
      if (!allMediaIds.has(pm.mediaId)) brokenRefs++;
      if (!optimizedMediaIds.has(pm.mediaId)) missingWebp++;
    }
  }

  const mediaTotal = await prisma.media.count();
  const mediaOptimized = await prisma.media.count({ where: { OR: [{ isOptimized: true }, { serveMode: 'auto' }] } });

  console.log('=== LIVE DATABASE AUDIT METRICS ===');
  console.log(JSON.stringify({
    totalProducts,
    productsUsingProductMediaOnly: pmOnly,
    productsUsingImagesJsonOnly: jsonOnly,
    productsUsingBoth: both,
    productsUsingNeither: neither,
    productMediaBrokenReferences: brokenRefs,
    productMediaMissingOptimizedVariants: missingWebp,
    mediaLibraryTotal: mediaTotal,
    mediaLibraryOptimized: mediaOptimized,
    migrationPercentage: totalProducts > 0 ? ((pmOnly + both) / totalProducts * 100).toFixed(1) + '%' : '0%'
  }, null, 2));

  await prisma.$disconnect();
}

auditData().catch(e => { console.error(e); process.exit(1); });
