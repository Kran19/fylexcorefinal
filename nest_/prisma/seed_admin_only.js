const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

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

async function clearDatabase() {
  console.log('🧹 Clearing existing database records (products, variants, categories, belts, boxes, carts, orders)...');
  
  const safeDelete = async (fn, name) => {
    try {
      await fn();
    } catch (e) {
      // Table might not exist or be empty, skip safely
    }
  };

  await safeDelete(() => prisma.cartItem.deleteMany({}), 'cartItem');
  await safeDelete(() => prisma.cart.deleteMany({}), 'cart');
  await safeDelete(() => prisma.orderItem.deleteMany({}), 'orderItem');
  await safeDelete(() => prisma.order.deleteMany({}), 'order');
  await safeDelete(() => prisma.review.deleteMany({}), 'review');
  await safeDelete(() => prisma.variantAttribute.deleteMany({}), 'variantAttribute');
  await safeDelete(() => prisma.variantImage.deleteMany({}), 'variantImage');
  await safeDelete(() => prisma.productVariant.deleteMany({}), 'productVariant');
  await safeDelete(() => prisma.productSpecification.deleteMany({}), 'productSpecification');
  await safeDelete(() => prisma.productTag.deleteMany({}), 'productTag');
  await safeDelete(() => prisma.productMedia.deleteMany({}), 'productMedia');
  await safeDelete(() => prisma.categorySpecGroup.deleteMany({}), 'categorySpecGroup');
  await safeDelete(() => prisma.categoryAttribute.deleteMany({}), 'categoryAttribute');
  await safeDelete(() => prisma.specGroupSpec.deleteMany({}), 'specGroupSpec');
  await safeDelete(() => prisma.attributeValue.deleteMany({}), 'attributeValue');
  await safeDelete(() => prisma.attribute.deleteMany({}), 'attribute');
  await safeDelete(() => prisma.specification.deleteMany({}), 'specification');
  await safeDelete(() => prisma.specificationGroup.deleteMany({}), 'specificationGroup');
  await safeDelete(() => prisma.product.deleteMany({}), 'product');
  await safeDelete(() => prisma.category.deleteMany({}), 'category');
  await safeDelete(() => prisma.belt.deleteMany({}), 'belt');
  await safeDelete(() => prisma.box.deleteMany({}), 'box');
  await safeDelete(() => prisma.coupon.deleteMany({}), 'coupon');
  await safeDelete(() => prisma.offer.deleteMany({}), 'offer');
  await safeDelete(() => prisma.homeSection.deleteMany({}), 'homeSection');

  console.log('✨ All store data tables cleared successfully.');
}

async function main() {
  console.log('🌱 Initializing clean database with admin credentials only...');

  clearUploadsDirectory();
  await clearDatabase();

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

