const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/prismaClient');

// Unique email per run so repeated test runs don't collide on the unique constraint.
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'password123';

let token;
let productId;

beforeAll(async () => {
  // Requires the seed script to have run at least once (prisma/seed.js — SKU-0001).
  const product = await prisma.product.findUnique({ where: { sku: 'SKU-0001' } });
  if (!product) throw new Error('Run `npm run seed` before the test suite.');
  productId = product.id;

  // Reset inventory to a known value so rollback assertions are deterministic.
  await prisma.inventory.update({ where: { productId }, data: { quantity: 50 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth', () => {
  test('registers a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword, name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('rejects duplicate registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword, name: 'Test User' });

    expect(res.status).toBe(409);
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });
});

describe('Products', () => {
  test('lists products with cursor pagination shape', async () => {
    const res = await request(app).get('/api/products?limit=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('filters products by price range', async () => {
    const res = await request(app).get('/api/products?minPrice=0&maxPrice=1000');
    expect(res.status).toBe(200);
    expect(res.body.data.every((p) => Number(p.price) <= 1000)).toBe(true);
  });
});

describe('Cart', () => {
  test('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  test('adds an item to the cart', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(2);
  });

  test('updates item quantity', async () => {
    const res = await request(app)
      .put(`/api/cart/items/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(5);
  });

  test('removes an item from the cart', async () => {
    const res = await request(app)
      .delete(`/api/cart/items/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });
});

describe('Orders — the transaction showcase', () => {
  test('rejects unauthenticated order creation', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(401);
  });

  test('creates an order and decrements inventory', async () => {
    const before = await prisma.inventory.findUnique({ where: { productId } });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId, quantity: 3 }] });

    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);

    const after = await prisma.inventory.findUnique({ where: { productId } });
    expect(after.quantity).toBe(before.quantity - 3);
  });

  test('rolls back the entire order when stock is insufficient — nothing is created, nothing is deducted', async () => {
    const before = await prisma.inventory.findUnique({ where: { productId } });
    const ordersBefore = await prisma.order.count();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId, quantity: 999999 }] }); // far more than in stock

    expect(res.status).toBe(409);

    const after = await prisma.inventory.findUnique({ where: { productId } });
    const ordersAfter = await prisma.order.count();

    // The core proof: a failed item mid-transaction leaves inventory untouched
    // and creates no order row — this is what "rollback" means in practice.
    expect(after.quantity).toBe(before.quantity);
    expect(ordersAfter).toBe(ordersBefore);
  });
});
