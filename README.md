# TechStore

A full-stack tech shop: a Spring Boot REST API backed by PostgreSQL, and a React storefront that
talks to it.

The backend is the finished part. It covers the catalogue, accounts and JWT authentication, orders
and checkout, and an admin dashboard with sales analytics. The frontend currently renders the
product grid; the account, cart and admin screens are still to come.

## Stack

**Backend** — Java 21, Spring Boot 4.1, Spring Security, Spring Data JPA / Hibernate, PostgreSQL,
Flyway, JJWT, Lombok, Maven.

**Frontend** — React 19, TypeScript, Vite, TanStack Query, Axios, Tailwind CSS v4.

## Layout

```
backend/
  src/main/java/com/techstore/
    admin/      dashboard analytics and user management
    auth/       users, roles, JWT, Spring Security config
    catalog/    categories and brands
    common/     shared DTOs, exceptions, error handling
    config/     typed configuration properties
    order/      orders, order items, status history, checkout
    product/    products and search
  src/main/resources/db/migration/   Flyway migrations (V1..V4)

frontend/
  src/
    api/        HTTP calls
    components/ presentational components
    features/   TanStack Query hooks
    lib/        axios client, formatting helpers
    types/      API response types
```

## Getting started

You need JDK 21+, Node 20+, and a running PostgreSQL 16+.

### 1. Create the database

```sql
CREATE DATABASE techstore_db;
```

Flyway creates the tables and seeds the products on first startup, so nothing else is needed here.

### 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and fill it in:

```
DB_URL=jdbc:postgresql://localhost:5432/techstore_db
DB_USERNAME=your_postgres_user
DB_PASSWORD=your_postgres_password

JWT_SECRET=a_long_random_string_of_at_least_32_characters

SERVER_PORT=8080
```

`JWT_SECRET` signs every token. Startup fails if it is missing or shorter than 32 characters, which
is deliberate: a short secret is a guessable one. Generate a good one with
`openssl rand -base64 48`.

`.env` is not committed. Everything else lives in `application.yml`.

### 3. Run the backend

```bash
cd backend
./mvnw spring-boot:run      # mvnw.cmd on Windows CMD/PowerShell
```

It serves on `http://localhost:8080`. Check it with `curl http://localhost:8080/api/health`.

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

It serves on `http://localhost:5173`. Vite proxies `/api` to port 8080, so both origins look like
one to the browser during development.

## Creating an admin user

New accounts are always `CUSTOMER` — the API has no way to register yourself as an admin, on
purpose. Promote the first one directly in the database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

The role is baked into the access token, so sign out and back in for it to take effect. After that,
an admin promotes everyone else through `PATCH /api/admin/users/{id}/role` — no more SQL. Admins
cannot change their own role, so the last admin can't accidentally lock everyone out.

## API

Public means no token needed.

| Method | Path | Access | What it does |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Liveness check |
| GET | `/api/products` | public | Paginated search — see the query parameters below |
| GET | `/api/products/all` | public | Every product, unpaginated |
| GET | `/api/products/{id}` | public | One product |
| GET | `/api/products/maxprice` | public | Highest price in cents, for the price filter |
| GET | `/api/categories` | public | Categories with product counts |
| GET | `/api/brands` | public | Brands with product counts |
| POST | `/api/auth/register` | public | Create an account and sign in |
| POST | `/api/auth/login` | public | Sign in |
| POST | `/api/auth/refresh` | public | Swap the refresh cookie for a new access token |
| POST | `/api/auth/logout` | public | Clear the refresh cookie |
| GET | `/api/auth/me` | signed in | The current account |
| POST | `/api/orders` | signed in | Checkout |
| GET | `/api/orders` | signed in | Your orders, newest first |
| GET | `/api/orders/{reference}` | signed in | One of your orders |
| GET | `/api/admin/dashboard` | admin | Every dashboard figure in one response |
| GET | `/api/admin/users` | admin | Accounts, newest first |
| PATCH | `/api/admin/users/{id}/role` | admin | Promote or demote an account |
| GET | `/api/admin/orders` | admin | All orders, filterable by status |
| GET | `/api/admin/orders/{reference}` | admin | One order, with the customer's email |
| PATCH | `/api/admin/orders/{reference}/status` | admin | Move an order to the next status |
| POST/PUT/DELETE | `/api/admin/categories` | admin | Manage categories |
| POST/PUT/DELETE | `/api/admin/brands` | admin | Manage brands |

### Product search parameters

`GET /api/products?search=laptop&maxPrice=150000&inStock=true&sort=price_asc&page=0&size=12`

| Parameter | Default | Notes |
| --- | --- | --- |
| `search` | — | Matches the name or the description, case-insensitive |
| `maxPrice` | — | In cents |
| `inStock` | `false` | `true` hides sold-out products |
| `sort` | `newest` | `price_asc`, `price_desc`, `name_asc`, `name_desc` |
| `page` | `0` | Zero-based |
| `size` | `12` | Capped at 60 |

### Errors

Every failure returns the same shape, so the frontend parses one format:

```json
{
  "timestamp": "2026-08-18T14:34:19Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Some fields are invalid",
  "path": "/api/auth/register",
  "fieldErrors": { "email": "Enter a valid email address" }
}
```

`fieldErrors` is filled in only for validation failures.

## How authentication works

Two tokens, on purpose:

- The **access token** is short-lived (15 minutes) and comes back in the JSON body. The frontend
  keeps it in memory and sends it as `Authorization: Bearer <token>`. Nothing writes it to
  localStorage, so an XSS has nothing lying around to steal.
- The **refresh token** is long-lived (30 days) and travels in an `HttpOnly` cookie scoped to
  `/api/auth`. JavaScript cannot read it, and the browser only attaches it to auth calls.

On page load, or after a 401, the frontend calls `/api/auth/refresh` to get a new access token
without asking for the password again.

There is no server-side session: a token is valid because its signature checks out, not because
anything was stored. So logging out clears the cookie and drops the access token, which stays
technically valid until it expires — hence the short lifetime. Real instant revocation needs a
denylist, which is a later phase.

**Before deploying:** the refresh cookie is created with `secure(false)` and `SameSite=Lax` because
local development is plain HTTP. Over HTTPS it must become `secure(true)`, and if the frontend and
API end up on different domains, `SameSite=None` as well. It is marked with a `TODO` in
`AuthController`.

## Domain rules

**Money** is stored and returned as integer cents everywhere. Never floats: `0.1 + 0.2` is not
`0.3` in binary, and those fractions become real accounting errors.

**Checkout** recomputes every total from database prices and ignores anything the client says about
money. It locks each product row before decrementing stock, always in id order, so two simultaneous
checkouts cannot both sell the last item or deadlock against each other. Each line stores the name,
image and price as they were at purchase time, so an old receipt stays accurate after the product
is renamed, repriced or deleted.

**Shipping** is a flat $14.99, free from $500.

**Order status** moves along a fixed path, checked server-side:

```
PENDING ──▶ PAID ──▶ SHIPPED ──▶ DELIVERED
   │         │
   └─────────┴──▶ CANCELLED
```

`DELIVERED` and `CANCELLED` are final. Every change appends a row to `order_events`, so an order
carries its own timeline of what happened and when.

**Revenue** counts `PAID`, `SHIPPED` and `DELIVERED` only — `PENDING` is not money yet and
`CANCELLED` never was. **Low stock** on the dashboard means 5 units or fewer.

**Order references** like `TS-2026-0007` come from a database sequence, not from counting rows, and
are shown instead of the primary key so sequential ids are never exposed in a URL.

## Database and migrations

Flyway owns the schema. Hibernate runs with `ddl-auto: validate`: it checks that the entities match
the tables and never changes anything itself.

| Migration | Contents |
| --- | --- |
| `V1__create_products_table.sql` | Products, plus the first seed rows |
| `V2__create_users_table.sql` | Accounts |
| `V3__add_categories_brands_and_product_metadata.sql` | Categories, brands, product metadata, more seed products |
| `V4__create_orders.sql` | Orders, order lines, status history |

**Never edit a migration that has already run.** Flyway stores a checksum of each file and refuses
to start if one changes. Corrections always arrive as a new `V5`, `V6`, and so on. To start over
locally, drop the database and let it rebuild.

## Common tasks

```bash
cd backend  && ./mvnw test          # backend tests
cd backend  && ./mvnw clean package # build the jar
cd frontend && npm run build        # typecheck and build
cd frontend && npm run lint
```

**Migration checksum mismatch on startup** — a migration file was edited after it ran. Undo the
edit, or drop the database and let Flyway rebuild it from scratch.

**403 on every `/api/admin` call** — the role lives inside the token. If the account was promoted
in SQL, sign out and back in to get a token that says `ADMIN`.
