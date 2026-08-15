# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phases 1–3 of `plan/roadmap.md` are implemented and verified end to end (catalog, guest cart, JWT auth + RBAC).

**Two conflicting phase numberings exist — this matters.** `SUBJECT.md` numbers phases 0–11 with Phase 1 = Authentication. `plan/roadmap.md` plus `plan/phase-N-*.md` number 1–10 with Phase 1 = product catalog and Phase 3 = accounts/RBAC. **The `plan/` numbering is the one being followed.** When the user says "phase N", assume `plan/phase-N-*.md`. `SUBJECT.md` remains the authoritative spec for *what* the finished product is; `plan/` is the authoritative build order.

Current state:

- `backend/` — Spring Boot 4.1.0 / Java 21, layered by feature: `auth/`, `product/`, `common/`, `config/`, `health/`. Flyway owns the schema (`V1` products, `V2` users); Hibernate runs `ddl-auto: validate` and never modifies it.
- `frontend/` — React 19 + TS + Vite 8 + Tailwind v4. Design tokens in `src/index.css` `@theme`; primitives in `src/components/ui/`; feature components in `components/{products,cart,auth,layout}/`; `api/`, `hooks/`, `lib/`, `store/`, `types/`.

Later phases (4–10: checkout, Stripe, admin catalog, AI assistant, WebSockets, caching/deploy) are **not** built. Do not assume entities or endpoints beyond what is in the working tree.

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

Public: `GET /api/health`, `GET /api/products`, `GET /api/products/{id}`, and `POST /api/auth/{register,login,refresh,logout}`.
Authenticated: `GET /api/auth/me`. ADMIN-only: `/api/admin/**` (reserved, no endpoints yet).

Every failure returns the same `ApiError` JSON shape (`timestamp`, `status`, `error`, `message`, `path`, plus `fieldErrors` on validation failures), built centrally in `common/GlobalExceptionHandler`.

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
