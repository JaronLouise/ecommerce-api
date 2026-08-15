const express = require('express');
const prisma = require('../prismaClient');
const requireAuth = require('../middleware/requireAuth');
const router = express.Router();

// POST /api/orders  (requires auth)
// body: { items: [{ productId, quantity }] }
// userId now comes from the verified JWT (req.user.id), never from the request body.
//
// This is the showcase endpoint: placing an order touches inventory, order,
// and order_items together. If stock is insufficient for ANY item, the whole
// transaction rolls back — no partial order, no over-deducted inventory.
router.post('/', requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  const { items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      let total = 0;
      const orderItemsData = [];

      for (const { productId, quantity } of items) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw Object.assign(new Error(`Product ${productId} not found`), { status: 404 });

        const inventory = await tx.inventory.findUnique({ where: { productId } });
        if (!inventory || inventory.quantity < quantity) {
          // Throwing inside $transaction rolls back everything done so far in this block —
          // this is the "insufficient stock mid-checkout" scenario from the brief.
          throw Object.assign(
            new Error(`Insufficient stock for ${product.name}`),
            { status: 409 }
          );
        }

        await tx.inventory.update({
          where: { productId },
          data: { quantity: { decrement: quantity } },
        });

        total += Number(product.price) * quantity;
        orderItemsData.push({
          productId,
          quantity,
          priceAtPurchase: product.price,
        });
      }

      return tx.order.create({
        data: {
          userId,
          total,
          status: 'PAID',
          items: { create: orderItemsData },
        },
        include: { items: true },
      });
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
