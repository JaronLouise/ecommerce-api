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
npm run seed                  # creates a sample category + product + inventory
npm run dev
```

API runs on `http://localhost:3000`. Health check: `GET /health`.

## Testing

```bash
npm run seed   # required once — tests assume seed data exists
npm test
```

Runs the full Jest + Supertest suite: registration/login, product listing and filtering, cart CRUD, unauthenticated-access rejection, a successful order (verifying inventory decrements), and — the key one — an order that exceeds available stock, verifying the transaction rolls back completely: no order row created, inventory left untouched.

Note: tests run against your dev database (`DATABASE_URL` in `.env`), not an isolated test DB. Fine for a portfolio project; a production setup would point `NODE_ENV=test` at a separate database.

## Endpoints so far

- `POST /api/auth/register` — creates a user, returns a JWT
- `POST /api/auth/login` — returns a JWT
- `GET /api/products` — cursor-paginated, filterable by `category`, `minPrice`, `maxPrice`
- `GET /api/products/:id`
- `GET /api/cart` **(auth required)**
- `POST /api/cart/items` **(auth required)** — body: `{ productId, quantity }`
- `PUT /api/cart/items/:productId` **(auth required)** — body: `{ quantity }`
- `DELETE /api/cart/items/:productId` **(auth required)**
- `POST /api/orders` **(auth required)** — places an order inside a DB transaction; rolls back entirely if any item is out of stock. `userId` is taken from the JWT, never from the request body.
- `GET /api/orders/:id` **(auth required)**

Send the token as `Authorization: Bearer <token>` on protected routes.

## Roadmap
- [x] Auth (JWT) + user registration/login
- [x] Cart endpoints (add/remove/update items)
- [x] Unit tests (Jest) for the order transaction — including a forced-failure test
- [ ] Swagger/OpenAPI docs
- [x] Seed script with sample categories/products for demo purposes
