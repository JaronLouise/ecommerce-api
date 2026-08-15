const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const category = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: { name: 'Electronics' },
  });

  const product = await prisma.product.upsert({
    where: { sku: 'SKU-0001' },
    update: {},
    create: {
      name: 'Wireless Mouse',
      description: 'A basic wireless mouse for testing.',
      price: 19.99,
      sku: 'SKU-0001',
      categoryId: category.id,
      inventory: { create: { quantity: 50 } },
    },
  });

  console.log('Seeded:', { category: category.name, product: product.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
