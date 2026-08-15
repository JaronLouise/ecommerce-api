const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List products with cursor pagination and filtering
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *     responses:
 *       200: { description: A page of products with a nextCursor for the following page }
 */
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

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by id
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product found }
 *       404: { description: Product not found }
 */
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
