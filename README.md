# E-Commerce API

A relational e-commerce backend built to demonstrate database design, data integrity via transactions, and REST API standards.

## Stack
Node.js, Express, PostgreSQL, Prisma

## Schema
See `prisma/schema.prisma`. Core relations:
- Category `1:M` Product
- User `1:M` Order, Cart
- Order `M:M` Product (via `OrderItem`)
- Cart `M:M` Product (via `CartItem`)
- Product `1:1` Inventory

## Setup

```bash
cp .env.example .env
docker-compose up -d          # starts Postgres
npm install
npx prisma migrate dev --name init
npm run dev
```

API runs on `http://localhost:3000`. Health check: `GET /health`.

## Endpoints so far

- `GET /api/products` — cursor-paginated, filterable by `category`, `minPrice`, `maxPrice`
- `GET /api/products/:id`
- `POST /api/orders` — places an order inside a DB transaction; rolls back entirely if any item is out of stock
- `GET /api/orders/:id`

## Roadmap
- [ ] Auth (JWT) + user registration/login
- [ ] Cart endpoints (add/remove/update items)
- [ ] Unit tests (Jest) for the order transaction — including a forced-failure test
- [ ] Swagger/OpenAPI docs
- [ ] Seed script with sample categories/products for demo purposes
