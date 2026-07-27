const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const products = await p.product.findMany({
    include: {
      variants: {
        include: {
          variantAttributes: { include: { attributeValue: true } },
          variantImages: { include: { media: true } }
        }
      },
      productMedia: { include: { media: true } },
      tags: true,
      specifications: true
    },
    take: 50
  });

  const categories = await p.category.findMany({ take: 50 });
  const attributes = await p.attribute.findMany({ include: { values: true }, take: 50 });
  const attributeValues = await p.attributeValue.findMany({ take: 200 });

  console.log(JSON.stringify({ products, categories, attributes, attributeValues }, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
