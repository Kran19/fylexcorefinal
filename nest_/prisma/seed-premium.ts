import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const COLLECTIONS_DIRS = [
  path.join(PROJECT_ROOT, 'ATLAS'),
  path.join(PROJECT_ROOT, 'MERIDIAN')
];
// If running inside docker (/app), UPLOADS_DIR should be /app/uploads
const isDocker = __dirname.startsWith('/app');
const UPLOADS_DIR = isDocker 
  ? '/app/uploads' 
  : path.join(PROJECT_ROOT, 'nest_', 'uploads');

// Premium Defaults
const PREMIUM_DEFAULTS = {
  movement: 'Swiss Automatic Calibre',
  warranty: '5 Years International Warranty',
  waterResistance: '300 metres / 1000 feet',
  caseSize: '42mm',
  caseMaterial: 'Oystersteel and 18ct Gold',
  strapMaterial: 'Premium Oyster Bracelet',
  dialColor: 'Signature Finish',
  glassType: 'Scratch-resistant Sapphire, Cyclops lens',
  powerReserve: '70 hours',
  gender: 'Men',
  weight: '160g',
  countryOfOrigin: 'Switzerland'
};

async function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyImageToUploads(srcPath: string, fileName: string): string {
  ensureDir(UPLOADS_DIR);
  // Hash the filename to avoid collisions, like multer might
  const ext = path.extname(fileName);
  const hash = crypto.randomBytes(16).toString('hex');
  const newFileName = `${hash}${ext}`;
  const destPath = path.join(UPLOADS_DIR, newFileName);
  
  fs.copyFileSync(srcPath, destPath);
  return newFileName;
}

async function setupTaxonomyAndAttributes() {
  console.log('📦 Setting up Categories, Brands, and Attributes...');

  // 1. Brand & Category
  const category = await prisma.category.upsert({
    where: { slug: 'luxury-watches' },
    update: {},
    create: { name: 'Luxury Watches', slug: 'luxury-watches', status: 1, featured: 1 }
  });

  const brand = await prisma.brand.upsert({
    where: { slug: 'fylex-brand' },
    update: {},
    create: { name: 'Fylex Official', slug: 'fylex-brand', isActive: true, isFeatured: 1 }
  });

  // 2. Attributes (Case Color, Dial Color, Belt)
  const createAttribute = async (code: string, name: string) => {
    return prisma.attribute.upsert({
      where: { code },
      update: { name },
      create: { name, code, type: 'select', isVariant: true }
    });
  };

  const attrCase = await createAttribute('attr_case_color', 'Case Color');
  const attrDial = await createAttribute('attr_dial_color', 'Dial Color');
  const attrBelt = await createAttribute('attr_belt_color', 'Belt Color');

  await prisma.categoryAttribute.upsert({
    where: { categoryId_attributeId: { categoryId: category.id, attributeId: attrCase.id } },
    update: {}, create: { categoryId: category.id, attributeId: attrCase.id }
  });
  await prisma.categoryAttribute.upsert({
    where: { categoryId_attributeId: { categoryId: category.id, attributeId: attrDial.id } },
    update: {}, create: { categoryId: category.id, attributeId: attrDial.id }
  });
  await prisma.categoryAttribute.upsert({
    where: { categoryId_attributeId: { categoryId: category.id, attributeId: attrBelt.id } },
    update: {}, create: { categoryId: category.id, attributeId: attrBelt.id }
  });

  // 3. Specifications
  const techGroup = await prisma.specificationGroup.findFirst({ where: { name: 'Technical Details' } }) 
    || await prisma.specificationGroup.create({ data: { name: 'Technical Details' } });

  const specsData = [
    { name: 'Movement', code: 'spec_move' },
    { name: 'Warranty Information', code: 'spec_warranty' },
    { name: 'Water Resistance', code: 'spec_water' },
    { name: 'Case Size', code: 'spec_case_size' },
    { name: 'Case Material', code: 'spec_case_mat' },
    { name: 'Strap Material', code: 'spec_strap_mat' },
    { name: 'Glass Type', code: 'spec_glass' },
    { name: 'Power Reserve', code: 'spec_power' },
    { name: 'Gender', code: 'spec_gender' },
    { name: 'Weight', code: 'spec_weight' },
    { name: 'Country of Origin', code: 'spec_origin' }
  ];

  const specs = {};
  for (const s of specsData) {
    const spec = await prisma.specification.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: { name: s.name, code: s.code }
    });
    specs[s.code] = spec;

    await prisma.specGroupSpec.upsert({
      where: { specificationGroupId_specificationId: { specificationGroupId: techGroup.id, specificationId: spec.id } },
      update: {}, create: { specificationGroupId: techGroup.id, specificationId: spec.id }
    });
  }

  await prisma.categorySpecGroup.upsert({
    where: { categoryId_specificationGroupId: { categoryId: category.id, specificationGroupId: techGroup.id } },
    update: {}, create: { categoryId: category.id, specificationGroupId: techGroup.id }
  });

  return { category, brand, attributes: { attrCase, attrDial, attrBelt }, specs };
}

function parseFilename(fileName: string, collection: string, caseColor: string, dialColor: string) {
  // Try to extract belt from filename like "ATLAS-BLACK C-BLACK D-BLUE B.png"
  // or "BLUE BELT_BLACK DIAL.png"
  let belt = 'Standard';
  const nameWithoutExt = path.basename(fileName, path.extname(fileName)).toUpperCase();
  
  if (nameWithoutExt.includes(' BELT')) {
    belt = nameWithoutExt.split(' BELT')[0].split('-').pop()?.trim() || belt;
  } else if (nameWithoutExt.includes(' B')) {
    const bMatch = nameWithoutExt.match(/-([^-]+) B($|-)/);
    if (bMatch) belt = bMatch[1].trim();
  } else {
    // If we can't find BELT or B, default to Standard, or check case
    belt = caseColor;
  }

  // Cleanup belt names
  belt = belt.replace(/_/g, ' ');
  belt = belt.charAt(0).toUpperCase() + belt.slice(1).toLowerCase();
  
  return belt;
}

function buildTree() {
  const tree: Record<string, Record<string, Record<string, Record<string, string[]>>>> = {};
  
  for (const baseDir of COLLECTIONS_DIRS) {
    if (!fs.existsSync(baseDir)) {
      console.log(`⚠️  Directory not found: ${baseDir}`);
      continue;
    }

    const collectionName = path.basename(baseDir).toUpperCase(); // e.g. ATLAS, MERIDIAN
    tree[collectionName] = {};

    // Inside ATLAS, there is another ATLAS folder
    const subDir = path.join(baseDir, collectionName);
    const targetDir = fs.existsSync(subDir) ? subDir : baseDir;

    // Case Colors (e.g. BLACK BLUE, GOLD)
    const caseDirs = fs.readdirSync(targetDir).filter(f => fs.statSync(path.join(targetDir, f)).isDirectory());
    for (const caseCol of caseDirs) {
      tree[collectionName][caseCol] = {};
      const casePath = path.join(targetDir, caseCol);
      
      const dialDirs = fs.readdirSync(casePath);
      let hasSubDirs = false;
      
      for (const d of dialDirs) {
        const dPath = path.join(casePath, d);
        if (fs.statSync(dPath).isDirectory()) {
          hasSubDirs = true;
          tree[collectionName][caseCol][d] = {};
          
          const files = fs.readdirSync(dPath).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
          for (const file of files) {
            const belt = parseFilename(file, collectionName, caseCol, d);
            if (!tree[collectionName][caseCol][d][belt]) tree[collectionName][caseCol][d][belt] = [];
            tree[collectionName][caseCol][d][belt].push(path.join(dPath, file));
          }
        }
      }

      // If no dial subdirectories, files are directly in Case folder (like ATLAS/ATLAS/GOLD/file.png)
      if (!hasSubDirs) {
        tree[collectionName][caseCol]['Default Dial'] = {};
        const files = fs.readdirSync(casePath).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
        for (const file of files) {
          let dial = 'Default Dial';
          const nameBase = path.basename(file, path.extname(file)).toUpperCase();
          const dMatch = nameBase.match(/-([^-]+) D($|-)/);
          if (dMatch) dial = dMatch[1].trim();
          
          if (!tree[collectionName][caseCol][dial]) tree[collectionName][caseCol][dial] = {};
          
          let belt = parseFilename(file, collectionName, caseCol, dial);
          if (!tree[collectionName][caseCol][dial][belt]) tree[collectionName][caseCol][dial][belt] = [];
          
          tree[collectionName][caseCol][dial][belt].push(path.join(casePath, file));
        }
      }
    }
  }
  return tree;
}

async function getOrCreateAttributeValue(attrId: number, valueStr: string) {
  const valueFormatted = valueStr.charAt(0).toUpperCase() + valueStr.slice(1).toLowerCase();
  let attrVal = await prisma.attributeValue.findFirst({
    where: { attributeId: attrId, label: valueFormatted }
  });
  
  if (!attrVal) {
    attrVal = await prisma.attributeValue.create({
      data: {
        attributeId: attrId,
        value: valueFormatted.toLowerCase().replace(/\s+/g, '-'),
        label: valueFormatted,
        code: `VAL_${valueFormatted.toUpperCase().replace(/\s+/g, '_')}`,
        status: 'active'
      }
    });
  }
  return attrVal;
}

async function seedData() {
  const meta = await setupTaxonomyAndAttributes();
  const tree = buildTree();
  
  for (const [collection, cases] of Object.entries(tree)) {
    console.log(`\n⌚ Processing Collection: ${collection}`);
    
    const productSlug = collection.toLowerCase();
    
    // Create Product
    const product = await prisma.product.upsert({
      where: { slug: productSlug },
      update: {
        name: `Fylex ${collection.charAt(0) + collection.slice(1).toLowerCase()}`,
        productType: 'configurable',
        status: 'active',
      },
      create: {
        name: `Fylex ${collection.charAt(0) + collection.slice(1).toLowerCase()}`,
        slug: productSlug,
        sku: `PRD-${collection}`,
        productType: 'configurable',
        status: 'active',
        brandId: meta.brand.id,
        mainCategoryId: meta.category.id,
        price: 25000,
        sellingPrice: 25000,
        qty: 1000,
        description: `<p>The exquisite Fylex ${collection}, crafted for perfection and elegance.</p>`,
        shortDescription: `Premium Luxury Watch - ${collection} Series`,
        isFeatured: true
      }
    });

    // Specifications
    const specMap: Record<string, string> = {
      spec_move: PREMIUM_DEFAULTS.movement,
      spec_warranty: PREMIUM_DEFAULTS.warranty,
      spec_water: PREMIUM_DEFAULTS.waterResistance,
      spec_case_size: PREMIUM_DEFAULTS.caseSize,
      spec_case_mat: PREMIUM_DEFAULTS.caseMaterial,
      spec_strap_mat: PREMIUM_DEFAULTS.strapMaterial,
      spec_glass: PREMIUM_DEFAULTS.glassType,
      spec_power: PREMIUM_DEFAULTS.powerReserve,
      spec_gender: PREMIUM_DEFAULTS.gender,
      spec_weight: PREMIUM_DEFAULTS.weight,
      spec_origin: PREMIUM_DEFAULTS.countryOfOrigin
    };

    for (const [code, value] of Object.entries(specMap)) {
      const spec = meta.specs[code];
      if (spec) {
        await prisma.productSpecification.findFirst({ where: { productId: product.id, specificationId: spec.id } }) ||
        await prisma.productSpecification.create({
          data: { productId: product.id, specificationId: spec.id, value }
        });
      }
    }

    // Process Variants
    for (const [caseCol, dials] of Object.entries(cases)) {
      for (const [dialCol, belts] of Object.entries(dials)) {
        for (const [beltCol, images] of Object.entries(belts)) {
          
          const caseStr = caseCol.replace(/\s+/g, '-').toUpperCase();
          const dialStr = dialCol.replace(/\s+/g, '-').toUpperCase();
          const beltStr = beltCol.replace(/\s+/g, '-').toUpperCase();
          const sku = `${collection}-${caseStr}-${dialStr}-${beltStr}`;
          
          console.log(`  -> Variant: ${sku}`);

          const variant = await prisma.productVariant.upsert({
            where: { sku },
            update: { price: 25000, sellingPrice: 25000, qty: 10, inStock: true },
            create: {
              productId: product.id,
              sku,
              price: 25000,
              sellingPrice: 25000,
              qty: 10,
              inStock: true,
              isActive: true,
              isDefault: (caseCol === Object.keys(cases)[0] && dialCol === Object.keys(dials)[0] && beltCol === Object.keys(belts)[0])
            }
          });

          // Attributes
          const caseVal = await getOrCreateAttributeValue(meta.attributes.attrCase.id, caseCol);
          const dialVal = await getOrCreateAttributeValue(meta.attributes.attrDial.id, dialCol);
          const beltVal = await getOrCreateAttributeValue(meta.attributes.attrBelt.id, beltCol);

          const linkAttr = async (valId: number, attrId: number) => {
            await prisma.variantAttribute.upsert({
              where: { variantId_attributeId: { variantId: variant.id, attributeId: attrId } },
              update: { attributeValueId: valId },
              create: { variantId: variant.id, attributeId: attrId, attributeValueId: valId }
            });
          };

          await linkAttr(caseVal.id, meta.attributes.attrCase.id);
          await linkAttr(dialVal.id, meta.attributes.attrDial.id);
          await linkAttr(beltVal.id, meta.attributes.attrBelt.id);

          // Images
          images.sort(); // order matching filesystem
          
          for (let i = 0; i < images.length; i++) {
            const originalPath = images[i];
            const originalFilename = path.basename(originalPath);
            const newFileName = copyImageToUploads(originalPath, originalFilename);
            
            // Create Media
            const media = await prisma.media.create({
              data: {
                fileName: newFileName,
                originalFilename: originalFilename,
                mimeType: `image/${path.extname(newFileName).substring(1)}`,
                extension: path.extname(newFileName).substring(1),
                fileSize: fs.statSync(originalPath).size,
                disk: 'local',
                filePath: `uploads/${newFileName}`,
                folderPath: `/${collection}/${caseCol}`
              }
            });

            // Link to Variant
            await prisma.variantImage.create({
              data: {
                variantId: variant.id,
                mediaId: media.id,
                isPrimary: i === 0 ? 1 : 0,
                sortOrder: i,
                type: i === 0 ? 'MAIN' : 'GALLERY'
              }
            });

            // Set product heroImage if this is default variant
            if (i === 0 && variant.isDefault) {
              await prisma.product.update({
                where: { id: product.id },
                data: { heroImage: `uploads/${newFileName}` }
              });
            }
          }
        }
      }
    }
  }
}

seedData().then(() => {
  console.log('✅ Premium Watch Seeding Completed Successfully!');
  process.exit(0);
}).catch(e => {
  console.error('❌ Seeder Failed:', e);
  process.exit(1);
});
