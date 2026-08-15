const express = require('express');
const prisma = require('../prismaClient');
const requireAuth = require('../middleware/requireAuth');
const router = express.Router();

// All cart routes require auth and operate on the current user's cart only.
router.use(requireAuth);

// Finds the user's cart, creating one if it doesn't exist yet.
async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findFirst({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return cart;
}

// GET /api/cart
router.get('/', async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const fullCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });
    res.json(fullCart);
  } catch (err) {
    next(err);
  }
});

// POST /api/cart/items   body: { productId, quantity }
router.post('/items', async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'productId and a positive quantity are required' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const cart = await getOrCreateCart(req.user.id);

    // Upsert: if the item's already in the cart, bump the quantity instead of duplicating the row.
    const item = await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, productId, quantity },
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// PUT /api/cart/items/:productId   body: { quantity }
router.put('/items/:productId', async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'A positive quantity is required' });
    }

    const cart = await getOrCreateCart(req.user.id);
    const item = await prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId: req.params.productId } },
      data: { quantity },
    });

    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Item not in cart' });
    next(err);
  }
});

// DELETE /api/cart/items/:productId
router.delete('/items/:productId', async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await prisma.cartItem.delete({
      where: { cartId_productId: { cartId: cart.id, productId: req.params.productId } },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Item not in cart' });
    next(err);
  }
});

module.exports = router;
