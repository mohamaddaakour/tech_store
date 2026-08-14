# TechStore AI — 10 phases

**The spine:** A shopper opens the app and sees real products, fetched live from a Postgres-backed Spring Boot API, rendered in the dark tile-grid style the whole product is built around.

**Stack:** React + TypeScript + Vite + Tailwind CSS (frontend), Spring Boot 3 + Java 21 + Spring Data JPA + PostgreSQL + Flyway (backend), Docker Compose for infra, Stripe for payments, WebSockets for real-time — all as specified in `SUBJECT.md`.

**Assumptions:**
- Postgres and Redis run in Docker; the backend (`mvn spring-boot:run`) and frontend (`npm run dev`) run natively on the host for a fast dev loop. Full containerization of the apps themselves is deferred to the deploy phase.
- Single deployable "store" for one seller (no multi-vendor) — matches the spec's core scope; multi-vendor is listed as a bonus.
- No email/SMS infra assumed available — email verification and password reset are parked as bonus, not blocking v1 auth.

| # | Phase | What runs at the end | Est. |
|---|-------|----------------------|------|
| 1 | Browse a real product catalog | `npm run dev` + `mvn spring-boot:run` → dark tile grid of real DB products in the browser | 4h |
| 2 | Cart that survives a refresh | Add to cart, reload the page, items are still there | 2h |
| 3 | Accounts: register, log in, cart follows you | Register/login with JWT + RBAC; cart now belongs to your account, not the browser | 4h |
| 4 | Checkout creates a real, stock-safe order | Checkout button turns a cart into a persisted `Order` with decremented stock | 4h |
| 5 | Pay with Stripe, order flips to PAID | Real Stripe test-mode checkout; webhook flips order status `PENDING → PAID` | 4h |
| 6 | Search, filter, sort — and manage the catalog as admin | Type in search, filter by brand/price; log in as ADMIN, create/edit/delete a product live | 5h |
| 7 | Ask the AI assistant real questions | Chat panel answers "laptops under $1000" using live DB data, never invents products | 4h |
| 8 | Live notifications over WebSockets | Change an order's status in the admin panel; the customer's tab updates instantly, no refresh | 4h |
| 9 | Console-grade navigation & motion | Arrow-key/gamepad tile navigation, focus glow, shared-element product transitions, `prefers-reduced-motion` support | 6h |
| 10 | Cache, harden, test, and ship | Redis-cached product list, CI running tests, `docker-compose.prod.yml` behind Nginx — one command boots the whole stack from a clean clone | 6h |

**Not in v1** (parked — build after phase 10, or interleave once the core loop is solid): product reviews & ratings, wishlist, recently-viewed/recommended rows, coupons/flash sales, PDF invoices, CSV import/export, Google/GitHub OAuth, email verification & password reset, RAG-based semantic search over embeddings, Elasticsearch/Meilisearch, PWA, multi-vendor mode, Kubernetes.

---

Phases 2–10 are written out in `plan/phase-2-*.md` … `plan/phase-10-*.md`. Phase 1 is expanded in full below — say **next** once it runs and I'll walk through Phase 2, or say **build it** and I'll implement it with you.
