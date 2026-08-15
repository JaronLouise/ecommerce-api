const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

// GET /api/products?cursor=<id>&limit=20&category=<id>&minPrice=&maxPrice=
// Cursor pagination: stable under inserts/deletes, unlike offset pagination.
router.get('/', async (req, res, next) => {
  try {
    const { cursor, limit = 20, category, minPrice, maxPrice } = req.query;

    const where = {
      ...(category && { categoryId: category }),
      ...(minPrice || maxPrice
        ? {
            price: {
              ...(minPrice && { gte: Number(minPrice) }),
              ...(maxPrice && { lte: Number(maxPrice) }),
            },
          }
        : {}),
    };

    const products = await prisma.product.findMany({
      take: Number(limit),
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      where,
      orderBy: { id: 'asc' },
      include: { category: true, inventory: true },
    });

    const nextCursor = products.length === Number(limit) ? products[products.length - 1].id : null;

    res.json({ data: products, nextCursor });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, inventory: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
