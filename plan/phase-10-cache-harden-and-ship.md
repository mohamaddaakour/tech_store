# Phase 10 — Cache, harden, test, and ship

**Goal:** The product listing is Redis-cached and measurably faster on repeat requests, a CI pipeline runs backend and frontend tests on every push, and `docker-compose.prod.yml` boots the entire stack (frontend, backend, Postgres, Redis, Nginx) from a clean clone with one command.
**Time:** ~6h · **Difficulty:** ●●●○○
**Depends on:** Phase 9 complete (everything else exists; this phase makes it fast, tested, and deployable)

## ✅ What you'll have when this is done

`@Cacheable` product queries backed by Redis, evicted on writes; a GitHub Actions workflow running `mvn test` and `npm run lint && npm run build`; a production Docker Compose file with Nginx reverse-proxying `/api` to the backend and everything else to the built frontend, running behind one `docker compose up`.

```bash
$ docker compose -f docker-compose.prod.yml up --build
```
Opening `http://localhost` shows the full app — no separate `npm run dev`/`mvn spring-boot:run` terminals needed. `curl -w '%{time_total}\n' localhost/api/products` is visibly faster on the second call than the first (cache hit).

## Why this phase now

Everything functional already exists by Phase 9 — this phase is explicitly "make it production-credible," which the spec places last (Phases 9–11) for the same reason this skill puts polish/deploy last: it's dependent on everything else being stable, and doing it earlier would mean re-doing it every time an earlier phase's API shape changed.

## Before you start

```bash
docker compose up -d redis   # add a redis service to the dev docker-compose.yml alongside postgres
```
`docker-compose.yml` (add)
```yaml
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

## Files in this phase

```
backend/src/main/
├── resources/application.yml            ← MODIFIED  spring.cache + redis config
└── java/com/techstore/
    ├── config/CacheConfig.java          ← NEW
    └── product/ProductController.java   ← MODIFIED  @Cacheable / @CacheEvict
backend/src/test/java/com/techstore/order/OrderServiceTest.java   ← NEW
frontend/src/App.test.tsx (or similar)                             ← NEW
.github/workflows/ci.yml                                           ← NEW
docker-compose.prod.yml                                            ← NEW
backend/Dockerfile, frontend/Dockerfile, nginx/nginx.conf           ← NEW
```

## Steps

### 1. Redis-backed caching with correct invalidation

**Why:** a cache that's never invalidated is a bug generator — the whole point of this step is pairing every `@Cacheable` read with the `@CacheEvict` that fires on the corresponding write.

`backend/pom.xml`: add `spring-boot-starter-data-redis`, `spring-boot-starter-cache`.

`backend/src/main/resources/application.yml` (add)
```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
  cache:
    type: redis
```

`backend/src/main/java/com/techstore/config/CacheConfig.java`
```java
package com.techstore.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {}
```

`ProductController.java` (or move to a `ProductService` if one doesn't exist yet)
```java
@Cacheable(value = "products", key = "#search + ':' + #brand + ':' + #minPrice + ':' + #pageable")
public Page<Product> list(String search, String brand, Integer minPrice, Pageable pageable) { ... }

@CacheEvict(value = "products", allEntries = true)   // ← every write busts the whole listing cache
public Product create(ProductRequest req) { ... }

@CacheEvict(value = "products", allEntries = true)
public Product update(Long id, ProductRequest req) { ... }
```

**Check:** `curl -w '%{time_total}\n' -o /dev/null -s localhost:8080/api/products` twice — second call is noticeably faster; `redis-cli KEYS '*'` shows a `products::...` key.

### 2. Backend and frontend tests

`backend/src/test/java/com/techstore/order/OrderServiceTest.java` — the one test that matters most given Phase 4's risk: checkout must reject over-quantity requests and must not partially decrement stock on failure.
```java
package com.techstore.order;

import com.techstore.product.Product;
import com.techstore.product.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")   // ← point this at a test DB/profile, not dev data
class OrderServiceTest {
    @Autowired OrderService orderService;
    @Autowired ProductRepository products;

    @Test
    void checkoutRejectsInsufficientStock() {
        Product p = products.findAll().get(0);
        int wayTooMany = p.getStock() + 1000;

        assertThrows(IllegalStateException.class, () ->
            orderService.checkout(1L, List.of(new OrderService.LineRequest(p.getId(), wayTooMany))));

        Product reloaded = products.findById(p.getId()).orElseThrow();
        assertEquals(p.getStock(), reloaded.getStock());   // ← proves no partial decrement happened
    }
}
```

Frontend: add a smoke test for `ProductGrid` (Vitest + React Testing Library) that mocks `fetchProducts` and asserts the tile count rendered.

### 3. CI pipeline

`.github/workflows/ci.yml`
```yaml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_DB: techstore, POSTGRES_USER: techstore, POSTGRES_PASSWORD: techstore }
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin' }
      - run: cd backend && ./mvnw test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci && npm run lint && npm run build
```

**Check:** push a branch, watch both jobs go green in the Actions tab.

### 4. Production Docker Compose behind Nginx

`backend/Dockerfile`
```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -q package -DskipTests

FROM eclipse-temurin:21-jre
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

`frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

`nginx/nginx.conf` — proxy `/api/` and `/ws` to `backend:8080`, everything else served as static files/SPA fallback to `index.html`.

`docker-compose.prod.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: techstore, POSTGRES_USER: techstore, POSTGRES_PASSWORD: techstore }
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
  backend:
    build: ./backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/techstore   # ← service name, not localhost
      SPRING_DATA_REDIS_HOST: redis
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on: [postgres, redis]
  frontend:
    build: ./frontend
  nginx:
    image: nginx:alpine
    volumes: [./nginx/nginx.conf:/etc/nginx/nginx.conf:ro]
    ports: ["80:80"]
    depends_on: [backend, frontend]

volumes:
  pgdata:
```

## Verify it works

```bash
docker compose -f docker-compose.prod.yml up --build
curl -w '%{time_total}\n' -o /dev/null -s http://localhost/api/products
curl -w '%{time_total}\n' -o /dev/null -s http://localhost/api/products   # ← faster, cache hit
```
Open `http://localhost` in a browser — the full app works with zero locally-running dev servers.

## Definition of done

- [ ] Second identical `GET /api/products` request is measurably faster than the first
- [ ] Writing a product (admin create/update/delete) invalidates the cache — a stale price never lingers
- [ ] CI runs and passes on a fresh push
- [ ] `docker compose -f docker-compose.prod.yml up --build` from a clean clone serves the whole app on `http://localhost`
- [ ] Committed (secrets passed via `.env`, gitignored, never baked into the image)

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| Stale product data after an admin edit | `@CacheEvict` missing on the write path, or evicting the wrong cache name | Confirm the cache `value` string matches exactly between `@Cacheable` and `@CacheEvict` |
| Backend can't reach Postgres/Redis in prod compose | Used `localhost` instead of the Docker Compose service name | Service names (`postgres`, `redis`) resolve inside the Compose network, `localhost` does not |
| CI green locally but red in Actions | Local Postgres was already running with seed data CI doesn't have | Ensure tests don't depend on Phase 1's seed data being present — seed what each test needs, or use Testcontainers |

## Deliberately NOT in this phase

- HTTPS/TLS termination, real domain, cloud hosting (AWS/Render/Railway) → deployment guide is a documentation task beyond this roadmap's scope; the compose file here is prod-shaped but still meant for local/staging use
- Horizontal scaling (multiple backend replicas, Redis Pub/Sub for the Phase 8 WebSocket broker) → only needed past single-instance scale
- Full test coverage breadth (this phase adds the highest-risk tests, not every test) → grow coverage incrementally after this point

## Commit

```bash
git commit -am "phase 10: Redis caching, CI, and production docker-compose behind Nginx"
```
