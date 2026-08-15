# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phases 1–3 of `plan/roadmap.md` are implemented and verified end to end (catalog, guest cart, JWT auth + RBAC).

**Two conflicting phase numberings exist — this matters.** `SUBJECT.md` numbers phases 0–11 with Phase 1 = Authentication. `plan/roadmap.md` plus `plan/phase-N-*.md` number 1–10 with Phase 1 = product catalog and Phase 3 = accounts/RBAC. **The `plan/` numbering is the one being followed.** When the user says "phase N", assume `plan/phase-N-*.md`. `SUBJECT.md` remains the authoritative spec for *what* the finished product is; `plan/` is the authoritative build order.

Current state:

- `backend/` — Spring Boot 4.1.0 / Java 21, layered by feature: `auth/`, `catalog/`, `product/`, `order/`, `admin/`, `common/`, `config/`, `health/`. Flyway owns the schema (`V1` products, `V2` users, `V3` categories+brands+product metadata, `V4` orders); Hibernate runs `ddl-auto: validate` and never modifies it.
- `frontend/` — React 19 + TS + Vite 8 + Tailwind v4 + React Router + TanStack Query + Zustand + Framer Motion + Recharts. Design tokens in `src/index.css` `@theme` (dark default, `html[data-theme="light"]` override); primitives in `components/ui/`; features in `components/{products,cart,auth,admin,layout,home,orders,search,assistant}/`; pages in `pages/` and `pages/admin/`.

**Also built beyond `plan/` phase 3:** SUBJECT.md's Phase 6 admin dashboard (analytics, product/category/brand CRUD, order management, user roles), and the Phase 2–3 backend it depends on (Category, Brand, Order, OrderItem, OrderEvent + stock-safe checkout).

Still **not** built: Stripe payments, reviews/wishlist persistence, a real AI assistant, WebSockets, Redis caching, product specifications as entities, and any frontend or backend test beyond the context-load smoke test.

## Non-obvious constraints discovered while building (read before touching the backend)

These cost real debugging time; they are not guessable from the code:

- **Spring Boot 4 uses Jackson 3.** The package is `tools.jackson.databind.*`, NOT `com.fasterxml.jackson.databind.*`. Copying any Boot 3 snippet that imports the old package fails to compile. Annotations are the exception — `@JsonInclude` and friends kept the original `com.fasterxml.jackson.annotation` package.
- **Boot 4 starters are modular.** `spring-boot-starter-web` does not exist; use `spring-boot-starter-webmvc`. Flyway needs `spring-boot-starter-flyway` — plain `flyway-core` on the classpath silently means no `FlywayAutoConfiguration`, so migrations never run and Hibernate then fails validation with "missing table".
- **Never edit an applied migration.** Flyway stores a checksum and refuses to start if a `V*.sql` file changes. Add a new version instead.
- **`UserDetailsServiceAutoConfiguration` is excluded** in `TechstoreApplication`. Without that, Spring Security invents a random in-memory user and prints its password on every boot.
- Postgres runs **natively on Windows** on 5432 in this environment, not via `docker-compose.yml`. Both bind 5432, so `docker compose up` will conflict with the native service.

## Intended architecture (from SUBJECT.md)

TechStore AI is a monorepo e-commerce platform with a console-dashboard-style UI (Xbox Series X dashboard inspired, not the marketing site) built on:

- **Frontend**: React + TypeScript + Vite, React Router, TanStack Query, Zustand, React Hook Form + Zod, Tailwind CSS, Framer Motion/GSAP for animation, Lenis for smooth scroll.
- **Backend**: Spring Boot (Java 21+), Spring Security with JWT access tokens + HttpOnly-cookie refresh tokens, Spring Data JPA/Hibernate, PostgreSQL, Flyway migrations, MapStruct, Lombok, OpenAPI/Swagger.
- **Infra**: Docker Compose (frontend, backend, PostgreSQL, Redis, Nginx), GitHub Actions CI.

Build order follows the phases in `SUBJECT.md`: project setup → auth (JWT + RBAC with `CUSTOMER`/`ADMIN` roles) → product catalog (Product/Category/Brand/Images/Specs with search/filter/pagination) → cart & orders (with stock-safe transactions and an order status state machine: `PENDING → PAID → SHIPPED → DELIVERED → CANCELLED`) → payments (Stripe + webhooks) → reviews/wishlist → admin dashboard → AI shopping assistant (DB-grounded, later RAG — must never hallucinate products) → real-time (WebSockets, optional Redis Pub/Sub) → caching (Redis) → testing/security → deployment.

When implementing a phase, check whether earlier phases' foundations (auth, entities, RBAC) already exist before re-deriving them — read the actual code, not just this doc.

## Commands

### Frontend (`frontend/`)

```
npm install       # install deps
npm run dev        # start Vite dev server
npm run build       # tsc -b && vite build
npm run lint        # eslint .
npm run preview      # preview production build
```

No test runner is configured yet. If adding tests, wire up the runner and commands here.

### Backend (`backend/`)

Use the Maven wrapper (`./mvnw`), not a global `mvn`.

```
./mvnw spring-boot:run              # start the API on :8080 (devtools auto-restarts on recompile)
./mvnw compile                      # compile only
./mvnw test                         # run tests
./mvnw -Dtest=ClassName#method test # run a single test
./mvnw dependency:tree              # inspect the classpath (note: -q suppresses the output entirely)
```

Requires `backend/.env` (see `.env.example`): `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SERVER_PORT`, and `JWT_SECRET` (≥32 chars, or the app refuses to start).

### Docker

`docker-compose.yml` exists (postgres, redis, backend, frontend) but is **untested** — the native Postgres on 5432 conflicts with the container. Its `backend.DB_URL` override must stay in sync with `POSTGRES_DB` in `backend/.env`.

## API surface (built so far)

**Public**
- `GET /api/health`
- `GET /api/products` — search/filter/sort/paginate: `?search=&category=&brand=&maxPrice=&inStock=&sort=&page=&size=`. Returns `PageResponse<ProductResponse>`, **not** a bare array.
- `GET /api/products/{id}`, `GET /api/products/meta` (price ceiling)
- `GET /api/categories`, `GET /api/brands` — facets with product counts
- `POST /api/auth/{register,login,refresh,logout}`

**Authenticated**
- `GET /api/auth/me`
- `POST /api/orders` (checkout), `GET /api/orders`, `GET /api/orders/{reference}`

**ADMIN only** (`/api/admin/**`, one `hasRole("ADMIN")` rule covers all of it)
- `GET /dashboard` — one aggregate: KPIs, 30-day sales trend, top sellers, status breakdown, low stock, recent orders
- `GET|POST /products`, `PUT|DELETE /products/{id}`
- `POST /categories`, `PUT|DELETE /categories/{id}` — same for `/brands`
- `GET /orders`, `GET /orders/{reference}`, `PATCH /orders/{reference}/status`
- `GET /users`, `PATCH /users/{id}/role`

Every failure returns the same `ApiError` JSON shape (`timestamp`, `status`, `error`, `message`, `path`, plus `fieldErrors` on validation failures), built centrally in `common/GlobalExceptionHandler`.

## Order and stock invariants — do not regress these

- **Checkout is the transaction that matters.** `OrderService.checkout` prices every line from the database (the request carries only ids and quantities), locks rows with `findByIdForUpdate` (`SELECT … FOR UPDATE`), and decrements stock in one transaction. Locks are taken in ascending product-id order to prevent deadlocks.
- Pessimistic locking at checkout, **optimistic** (`@Version`) for admin edits. Different problems: checkout must *prevent* overselling, edits only need to *detect* a conflict (→ 409).
- `OrderStatus` owns the transition table. PENDING→PAID→SHIPPED→DELIVERED, cancel from PENDING/PAID only; DELIVERED and CANCELLED are terminal. The API returns `allowedNextStatuses` so the UI renders only valid moves.
- Order lines **snapshot** name/image/price. Never read them live from the product — a receipt must show what was actually paid.
- Cancelling does **not** restock. That is a deliberate business decision belonging with Phase 4 refunds.
- `order_reference_seq` (a Postgres sequence) generates references. Never `count() + 1` — that races.
- Revenue means `PAID|SHIPPED|DELIVERED` (`OrderStatus.REVENUE_STATUSES`). The KPI and the sales chart both use it; if you change one, change both or the dashboard contradicts itself.

## Gotchas that cost time here

- **Hibernate cannot fetch two `List` collections in one query** — `MultipleBagFetchException`. `OrderRepository.findByReference` fetches `items` but leaves `events` lazy for exactly this reason.
- The first ADMIN must be promoted in SQL (`UPDATE users SET role='ADMIN' WHERE email=…`), since `PATCH /admin/users/{id}/role` itself requires an admin. The server also refuses self-demotion, so you cannot lock yourself out.
- **Vite is pinned to port 5173 with `strictPort: true`.** The backend's CORS allowlist permits only `http://localhost:5173`, and a CORS block is indistinguishable from "backend down" to axios — it surfaces as "Cannot reach the server." Failing loudly on a taken port beats debugging a phantom outage. `127.0.0.1:5173` is a *different* origin and is also blocked.

## Auth invariants — do not regress these

- Access token: 15 min, returned in the response body, held **in memory only** on the frontend (`store/authStore.ts` has no `persist` middleware — deliberately). Never put it in `localStorage`.
- Refresh token: 30 days, HttpOnly cookie scoped to `path=/api/auth`. Verified unreadable from `document.cookie`.
- `secure(false)` on the cookie is dev-only; Phase 10 must flip it to `true` (and `sameSite("None")` if the frontend moves to a different domain).
- Both `withCredentials: true` (axios) and `setAllowCredentials(true)` (CORS) are required. If either is dropped, login appears to work but sessions die on reload.
- Tokens carry a `typ` claim and every verification asserts the expected type, so a refresh token cannot be used as a bearer access token.
- `api/client.ts` refreshes on 401 and retries once, deduping concurrent refreshes via a single in-flight promise. `/auth/login|register|refresh|logout` are exempt so a genuine 401 is not mistaken for an expired token.

## Key constraints from the spec worth respecting in implementation

- Refresh tokens must live in HttpOnly cookies, not localStorage; access tokens are short-lived JWTs.
- Stock updates during checkout must be transaction-safe against overselling (spec calls out choosing optimistic vs. pessimistic locking deliberately).
- The AI assistant must ground answers in actual DB/product data and must never invent products that don't exist.
- UI must respect `prefers-reduced-motion` and provide a low-motion mode despite the animation-heavy design direction.
