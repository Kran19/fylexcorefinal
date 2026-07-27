const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportFullDatabase() {
  console.log('📦 Fetching data from local database...');

  const data = {
    admins: await prisma.admin.findMany(),
    settings: await prisma.setting.findMany(),
    banners: await prisma.banner.findMany(),
    homeSections: await prisma.homeSection.findMany(),
    homePageSections: await prisma.homePageSection.findMany(),
    faqs: await prisma.faq.findMany(),
    testimonials: await prisma.testimonial.findMany(),
    communityImages: await prisma.communityImage.findMany(),
    pages: await prisma.page.findMany(),
    careSteps: await prisma.productCareStep.findMany(),
    belts: await prisma.belt.findMany(),
    boxes: await prisma.box.findMany(),
    categories: await prisma.category.findMany(),
    brands: await prisma.brand.findMany(),
    attributes: await prisma.attribute.findMany({ include: { values: true } }),
    tags: await prisma.tag.findMany(),
    specifications: await prisma.specification.findMany(),
    products: await prisma.product.findMany({
      include: {
        variants: {
          include: {
            variantAttributes: true,
            variantImages: true
          }
        },
        productMedia: true,
        tags: true,
        specifications: true,
        productBelts: true,
        productBoxes: true
      }
    }),
    media: await prisma.media.findMany()
  };

  const seedScriptContent = `/**
 * FYLEX FULL DATABASE SEED SCRIPT
 * Generated automatically from local database.
 * Contains: Admins, Products, Variants, Settings, FAQs, Banners, HomeSections, CareSteps, Testimonials, etc.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SEED_DATA = ${JSON.stringify(data, null, 2)};

async function main() {
  console.log('🚀 Starting Full Database Seed...');

  // 0. Admins
  console.log('⏳ Seeding Admin user (admin@fylex.com)...');
  const defaultAdminPasswordHash = '$2b$10$jCnaE/qg9wx43TNgApPdm.47Ym/qSj3UVmH6YtFJmD5FbtnjFWeS6'; // 'admin123'
  await prisma.admin.upsert({
    where: { email: 'admin@fylex.com' },
    update: { password: defaultAdminPasswordHash, status: 1 },
    create: {
      name: 'Fylex Admin',
      email: 'admin@fylex.com',
      password: defaultAdminPasswordHash,
      role: 'admin',
      status: 1
    }
  }).catch(e => console.error('  Admin error:', e.message));

  // 1. Settings (Fixed group_key unique constraint)
  console.log('⏳ Seeding Settings (' + SEED_DATA.settings.length + ')...');
  for (const item of SEED_DATA.settings) {
    const groupVal = item.group || 'general';
    await prisma.setting.upsert({
      where: {
        group_key: {
          group: groupVal,
          key: item.key
        }
      },
      update: { value: item.value, label: item.label || item.key, type: item.type || 'text' },
      create: {
        group: groupVal,
        key: item.key,
        value: item.value,
        label: item.label || item.key,
        type: item.type || 'text',
        description: item.description || null,
        options: item.options || null
      }
    }).catch(e => console.error('  Setting error (' + item.key + '):', e.message));
  }

  // 2. FAQs
  console.log('⏳ Seeding FAQs (' + SEED_DATA.faqs.length + ')...');
  for (const item of SEED_DATA.faqs) {
    await prisma.faq.upsert({
      where: { id: item.id },
      update: { question: item.question, answer: item.answer, sortOrder: item.sortOrder, isActive: item.isActive },
      create: { id: item.id, question: item.question, answer: item.answer, sortOrder: item.sortOrder, isActive: item.isActive }
    }).catch(e => console.error('  FAQ error:', e.message));
  }

  // 3. Banners
  console.log('⏳ Seeding Banners (' + SEED_DATA.banners.length + ')...');
  for (const item of SEED_DATA.banners) {
    await prisma.banner.upsert({
      where: { id: item.id },
      update: { name: item.name, title: item.title, subtitle: item.subtitle, content: item.content, image: item.image, link: item.link, textColor: item.textColor, type: item.type, position: item.position, isActive: item.isActive, sortOrder: item.sortOrder },
      create: { id: item.id, name: item.name, title: item.title, subtitle: item.subtitle, content: item.content, image: item.image, link: item.link, textColor: item.textColor, type: item.type, position: item.position, isActive: item.isActive, sortOrder: item.sortOrder }
    }).catch(e => console.error('  Banner error:', e.message));
  }

  // 4. Home Sections
  console.log('⏳ Seeding Home Sections (' + SEED_DATA.homeSections.length + ')...');
  for (const item of SEED_DATA.homeSections) {
    await prisma.homeSection.upsert({
      where: { id: item.id },
      update: { title: item.title, type: item.type, content: item.content, isActive: item.isActive, sortOrder: item.sortOrder },
      create: { id: item.id, title: item.title, type: item.type, content: item.content, isActive: item.isActive, sortOrder: item.sortOrder }
    }).catch(e => console.error('  HomeSection error:', e.message));
  }

  // 5. Community Images
  console.log('⏳ Seeding Community Images (' + SEED_DATA.communityImages.length + ')...');
  for (const item of SEED_DATA.communityImages) {
    await prisma.communityImage.upsert({
      where: { id: item.id },
      update: { title: item.title, image: item.image, sortOrder: item.sortOrder, isActive: item.isActive },
      create: { id: item.id, title: item.title, image: item.image, sortOrder: item.sortOrder, isActive: item.isActive }
    }).catch(e => console.error('  CommunityImage error:', e.message));
  }

  // 6. Testimonials
  console.log('⏳ Seeding Testimonials (' + SEED_DATA.testimonials.length + ')...');
  for (const item of SEED_DATA.testimonials) {
    await prisma.testimonial.upsert({
      where: { id: item.id },
      update: { author: item.author, role: item.role, quote: item.quote, avatar: item.avatar, rating: item.rating, isActive: item.isActive, sortOrder: item.sortOrder },
      create: { id: item.id, author: item.author, role: item.role, quote: item.quote, avatar: item.avatar, rating: item.rating, isActive: item.isActive, sortOrder: item.sortOrder }
    }).catch(e => console.error('  Testimonial error:', e.message));
  }

  // 7. Pages
  console.log('⏳ Seeding Pages (' + SEED_DATA.pages.length + ')...');
  for (const item of SEED_DATA.pages) {
    await prisma.page.upsert({
      where: { id: item.id },
      update: { title: item.title, slug: item.slug, content: item.content, status: item.status },
      create: { id: item.id, title: item.title, slug: item.slug, content: item.content, status: item.status }
    }).catch(e => console.error('  Page error:', e.message));
  }

  // 8. Categories
  console.log('⏳ Seeding Categories (' + SEED_DATA.categories.length + ')...');
  for (const item of SEED_DATA.categories) {
    await prisma.category.upsert({
      where: { id: item.id },
      update: { name: item.name, slug: item.slug, status: item.status, sortOrder: item.sortOrder },
      create: { id: item.id, name: item.name, slug: item.slug, status: item.status, sortOrder: item.sortOrder }
    }).catch(e => console.error('  Category error:', e.message));
  }

  // 9. Brands
  console.log('⏳ Seeding Brands (' + SEED_DATA.brands.length + ')...');
  for (const item of SEED_DATA.brands) {
    await prisma.brand.upsert({
      where: { id: item.id },
      update: { name: item.name, slug: item.slug, logo: item.logo, status: item.status },
      create: { id: item.id, name: item.name, slug: item.slug, logo: item.logo, status: item.status }
    }).catch(e => console.error('  Brand error:', e.message));
  }

  // 10. Attributes & Values
  console.log('⏳ Seeding Attributes (' + SEED_DATA.attributes.length + ')...');
  for (const attr of SEED_DATA.attributes) {
    await prisma.attribute.upsert({
      where: { id: attr.id },
      update: { name: attr.name, code: attr.code, type: attr.type },
      create: { id: attr.id, name: attr.name, code: attr.code, type: attr.type, status: attr.status || 'active' }
    }).catch(e => console.error('  Attribute error:', e.message));

    if (attr.values) {
      for (const val of attr.values) {
        await prisma.attributeValue.upsert({
          where: { id: val.id },
          update: { label: val.label, value: val.value, code: val.code },
          create: { id: val.id, attributeId: attr.id, value: val.value, label: val.label, code: val.code, status: val.status || 'active', sortOrder: val.sortOrder || 0 }
        }).catch(e => console.error('  AttributeValue error:', e.message));
      }
    }
  }

  // 11. Media Records
  console.log('⏳ Seeding Media (' + SEED_DATA.media.length + ')...');
  for (const m of SEED_DATA.media) {
    await prisma.media.upsert({
      where: { id: m.id },
      update: { filePath: m.filePath, fileName: m.fileName, originalFilename: m.originalFilename },
      create: { id: m.id, disk: m.disk || 'local', filePath: m.filePath, fileName: m.fileName, originalFilename: m.originalFilename, mimeType: m.mimeType || 'image/png', extension: m.extension || 'png', fileSize: m.fileSize || 100000, folderPath: m.folderPath }
    }).catch(e => console.error('  Media error:', e.message));
  }

  // 12. Belts
  console.log('⏳ Seeding Belts (' + SEED_DATA.belts.length + ')...');
  for (const b of SEED_DATA.belts) {
    await prisma.belt.upsert({
      where: { id: b.id },
      update: { name: b.name, price: b.price, stock: b.stock, isActive: b.isActive, imageId: b.imageId },
      create: { id: b.id, name: b.name, price: b.price, stock: b.stock, isActive: b.isActive, imageId: b.imageId }
    }).catch(e => console.error('  Belt error:', e.message));
  }

  // 13. Boxes
  console.log('⏳ Seeding Boxes (' + SEED_DATA.boxes.length + ')...');
  for (const b of SEED_DATA.boxes) {
    await prisma.box.upsert({
      where: { id: b.id },
      update: { name: b.name, isActive: b.isActive, imageId: b.imageId },
      create: { id: b.id, name: b.name, isActive: b.isActive, imageId: b.imageId }
    }).catch(e => console.error('  Box error:', e.message));
  }

  // 14. Products & Variants
  console.log('⏳ Seeding Products (' + SEED_DATA.products.length + ')...');
  for (const prod of SEED_DATA.products) {
    const { variants, productMedia, tags, specifications, productBelts, productBoxes, ...prodData } = prod;
    
    await prisma.product.upsert({
      where: { id: prodData.id },
      update: {
        name: prodData.name,
        slug: prodData.slug,
        sku: prodData.sku,
        price: prodData.price,
        sellingPrice: prodData.sellingPrice,
        qty: prodData.qty,
        status: prodData.status,
        isFeatured: prodData.isFeatured,
        bgColor: prodData.bgColor,
        accentColor: prodData.accentColor,
        textColor: prodData.textColor,
        theme: prodData.theme,
        shortDescription: prodData.shortDescription,
        description: prodData.description,
        heroImage: prodData.heroImage,
        videoUrl: prodData.videoUrl,
        discoverHeroBgImage: prodData.discoverHeroBgImage
      },
      create: {
        id: prodData.id,
        brandId: prodData.brandId || 1,
        mainCategoryId: prodData.mainCategoryId || 1,
        name: prodData.name,
        slug: prodData.slug,
        sku: prodData.sku,
        productCode: prodData.productCode || '',
        productType: prodData.productType || 'configurable',
        price: prodData.price,
        sellingPrice: prodData.sellingPrice || prodData.price,
        qty: prodData.qty || 0,
        status: prodData.status || 'active',
        isFeatured: prodData.isFeatured || false,
        bgColor: prodData.bgColor || '#ffffff',
        accentColor: prodData.accentColor || '#c4a35a',
        textColor: prodData.textColor || '#1a1a1a',
        theme: prodData.theme || '',
        shortDescription: prodData.shortDescription || '',
        description: prodData.description || '',
        heroImage: prodData.heroImage || '',
        videoUrl: prodData.videoUrl || '',
        discoverHeroBgImage: prodData.discoverHeroBgImage || '',
        images: prodData.images || '[]'
      }
    }).catch(e => console.error('  Product error (' + prodData.name + '):', e.message));

    // Seed Variants
    if (variants && variants.length > 0) {
      for (const v of variants) {
        const { variantAttributes, variantImages, ...vData } = v;
        const variant = await prisma.productVariant.upsert({
          where: { id: vData.id },
          update: { sku: vData.sku, price: vData.price, qty: vData.qty, isActive: vData.isActive },
          create: {
            id: vData.id,
            productId: prodData.id,
            sku: vData.sku,
            price: vData.price,
            sellingPrice: vData.sellingPrice || vData.price,
            qty: vData.qty || 0,
            inStock: vData.inStock !== false,
            stockStatus: vData.stockStatus || 'instock',
            isActive: vData.isActive !== false,
            isDefault: vData.isDefault || false,
            isSoldConfiguration: vData.isSoldConfiguration || false,
            fakeSoldCount: vData.fakeSoldCount || 0
          }
        }).catch(e => console.error('    Variant error (' + vData.sku + '):', e.message));

        if (variant && variantAttributes) {
          for (const va of variantAttributes) {
            await prisma.variantAttribute.upsert({
              where: { id: va.id },
              update: { attributeId: va.attributeId, attributeValueId: va.attributeValueId },
              create: { id: va.id, variantId: variant.id, attributeId: va.attributeId, attributeValueId: va.attributeValueId }
            }).catch(() => {});
          }
        }

        if (variant && variantImages) {
          for (const vi of variantImages) {
            await prisma.variantImage.upsert({
              where: { id: vi.id },
              update: { mediaId: vi.mediaId, type: vi.type, isPrimary: vi.isPrimary, sortOrder: vi.sortOrder },
              create: { id: vi.id, variantId: variant.id, mediaId: vi.mediaId, type: vi.type || 'MAIN', isPrimary: vi.isPrimary || 0, sortOrder: vi.sortOrder || 0 }
            }).catch(() => {});
          }
        }
      }
    }

    // Seed ProductMedia
    if (productMedia && productMedia.length > 0) {
      for (const pm of productMedia) {
        await prisma.productMedia.upsert({
          where: { id: pm.id },
          update: { mediaId: pm.mediaId, type: pm.type, sortOrder: pm.sortOrder },
          create: { id: pm.id, productId: prodData.id, mediaId: pm.mediaId, type: pm.type || 'GALLERY', sortOrder: pm.sortOrder || 0 }
        }).catch(() => {});
      }
    }
  }

  // 15. Care Steps
  console.log('⏳ Seeding Care Steps (' + SEED_DATA.careSteps.length + ')...');
  for (const cs of SEED_DATA.careSteps) {
    await prisma.productCareStep.upsert({
      where: { id: cs.id },
      update: { title: cs.title, description: cs.description, stepNumber: cs.stepNumber, imageUrl: cs.imageUrl },
      create: { id: cs.id, productId: cs.productId, stepNumber: cs.stepNumber, title: cs.title, description: cs.description, imageUrl: cs.imageUrl }
    }).catch(e => console.error('  CareStep error:', e.message));
  }

  console.log('✨ FULL DATABASE SEED COMPLETED SUCCESSFULLY!');
}

main()
  .catch(e => {
    console.error('❌ Seed Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  const outputPath = path.join(__dirname, 'prisma', 'seed_full_database.js');
  fs.writeFileSync(outputPath, seedScriptContent);
  console.log(`✅ Generated seed script: ${outputPath}`);
}

exportFullDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
