# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is at the very start of a large, multi-phase build described in `SUBJECT.md` (read it in full before planning any nontrivial work — it is the authoritative spec). Current actual state:

- `frontend/` — a stock `npm create vite@latest -- --template react-ts` scaffold. No app code beyond `App.tsx`/`main.tsx` defaults yet.
- `backend/` — empty directory. No Spring Boot project has been initialized yet.

Do not assume any architecture, entities, or endpoints exist beyond what you find in the working tree — `SUBJECT.md` describes the target end state (phases 0–11 plus bonus features), not what's built. When starting backend work, initialize the Spring Boot project per Phase 0 of `SUBJECT.md` (Maven, Java 21+, Spring Boot, PostgreSQL, Flyway, Swagger) rather than assuming a layout.

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

Not yet initialized. Once scaffolded per Phase 0 (Maven-based Spring Boot project), add the actual build/test/run commands here (e.g. `mvn spring-boot:run`, `mvn test`, `mvn -Dtest=ClassName#method test` for a single test).

### Docker

`docker-compose.yml` (root) does not exist yet — Phase 0 calls for it to bring up backend, frontend, PostgreSQL, and Redis together.

## Key constraints from the spec worth respecting in implementation

- Refresh tokens must live in HttpOnly cookies, not localStorage; access tokens are short-lived JWTs.
- Stock updates during checkout must be transaction-safe against overselling (spec calls out choosing optimistic vs. pessimistic locking deliberately).
- The AI assistant must ground answers in actual DB/product data and must never invent products that don't exist.
- UI must respect `prefers-reduced-motion` and provide a low-motion mode despite the animation-heavy design direction.
