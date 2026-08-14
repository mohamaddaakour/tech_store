# Phase 1 — Browse a real product catalog

**Goal:** A shopper opens the app in a browser and sees real products — name, price, stock — fetched live from a Postgres-backed Spring Boot API, rendered as a dark tile grid.
**Time:** ~4h · **Difficulty:** ●●○○○
**Depends on:** nothing (this is the spine)

## ✅ What you'll have when this is done

A running Postgres container seeded with a handful of real products via a Flyway migration, a Spring Boot API exposing `GET /api/products`, and the existing Vite/React frontend replaced with a dark tile grid that fetches and renders them. Nothing is hardcoded in the frontend — delete a row in the DB and it disappears from the page on refresh.

```bash
$ docker compose up -d postgres
$ (cd backend && ./mvnw spring-boot:run)      # terminal 2
$ (cd frontend && npm run dev)                 # terminal 3
```
Open `http://localhost:5173` → a dark grid of product tiles: "ROG Strix G16", "$1,499.00", "In stock", etc. — pulled from the DB, not hardcoded.

## Why this phase now

Everything else in this project — cart, checkout, admin, AI assistant — is built on top of "frontend talks to backend talks to database." Proving that round trip end-to-end, thinly, first means every later phase is additive instead of debugging plumbing under pressure.

## Before you start

```bash
java -version     # need 21+
node -version      # need 20+
docker -version
```
No accounts or API keys needed for this phase.

## Files in this phase

```
tech_store_main/
├── docker-compose.yml                                          ← NEW
├── backend/                                                     ← NEW (Spring Boot project)
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/techstore/
│       │   ├── TechstoreApplication.java
│       │   └── product/
│       │       ├── Product.java
│       │       ├── ProductRepository.java
│       │       └── ProductController.java
│       └── resources/
│           ├── application.yml
│           └── db/migration/V1__create_products_table.sql
└── frontend/src/
    ├── index.css                    ← MODIFIED  Tailwind + dark theme tokens
    ├── vite.config.ts               ← MODIFIED  add Tailwind plugin
    ├── App.tsx                      ← MODIFIED  render ProductGrid
    ├── types/product.ts             ← NEW
    ├── api/client.ts                ← NEW
    ├── api/products.ts              ← NEW
    └── components/
        ├── ProductGrid.tsx          ← NEW
        └── ProductCard.tsx          ← NEW
```

## Steps

### 1. Bring up Postgres

**Why:** everything downstream needs a real database — no in-memory shortcuts, or the migration/entity work you do here gets thrown away in Phase 2+.

`docker-compose.yml` (repo root)
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: techstore        # ← must match spring.datasource.url below
      POSTGRES_USER: techstore
      POSTGRES_PASSWORD: techstore
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**Check:** `docker compose up -d postgres && docker compose ps` → `postgres` shows `running (healthy)` or just `running`.

### 2. Scaffold the Spring Boot project

**Why:** using [start.spring.io](https://start.spring.io) gets you a correct Maven wrapper and directory layout instead of hand-rolling one.

Generate via the Spring Initializr CLI (or the website) with: Java 21, Maven, Spring Boot 3.3.x, artifact `backend`, package `com.techstore`, dependencies `Spring Web`, `Spring Data JPA`, `PostgreSQL Driver`, `Flyway Migration`, `Lombok`.

```bash
curl -s https://start.spring.io/starter.zip \
  -d type=maven-project -d language=java -d bootVersion=3.3.4 \
  -d baseDir=backend -d groupId=com.techstore -d artifactId=backend \
  -d name=techstore -d packageName=com.techstore -d javaVersion=21 \
  -d dependencies=web,data-jpa,postgresql,flyway,lombok \
  -o backend.zip && unzip -q backend.zip -d . && rm backend.zip
```

`backend/src/main/resources/application.yml` (replace `application.properties`)
```yaml
spring:
  application:
    name: techstore
  datasource:
    url: jdbc:postgresql://localhost:5432/techstore   # ← matches docker-compose.yml
    username: techstore
    password: techstore
  jpa:
    hibernate:
      ddl-auto: validate    # ← schema comes from Flyway, never Hibernate auto-DDL
    open-in-view: false
  flyway:
    enabled: true

server:
  port: 8080
```

**Check:** `cd backend && ./mvnw -q compile` finishes with no errors.

### 2. Create the migration and entity

**Why:** Flyway-versioned schema (not Hibernate `ddl-auto: update`) is what the spec calls for and what keeps schema changes reviewable as the project grows.

`backend/src/main/resources/db/migration/V1__create_products_table.sql`
```sql
CREATE TABLE products (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
    price_cents   INTEGER NOT NULL,       -- ← store money as integer cents, never float
    stock         INTEGER NOT NULL DEFAULT 0,
    image_url     VARCHAR(500)
);

INSERT INTO products (name, description, price_cents, stock, image_url) VALUES
    ('ROG Strix G16', '16" gaming laptop, RTX 4070, 32GB RAM', 149900, 12, 'https://placehold.co/600x400'),
    ('UltraSharp 27" 4K', 'Color-accurate monitor for creators', 62900, 30, 'https://placehold.co/600x400'),
    ('MX Master 3S', 'Wireless productivity mouse', 9900, 120, 'https://placehold.co/600x400'),
    ('ThinkPad X1 Carbon', '14" business ultrabook, 32GB RAM', 189900, 5, 'https://placehold.co/600x400');
```

`backend/src/main/java/com/techstore/product/Product.java`
```java
package com.techstore.product;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;

    @Column(name = "price_cents")
    private Integer priceCents;   // ← integer cents, never double/float for money

    private Integer stock;

    @Column(name = "image_url")
    private String imageUrl;
}
```

`backend/src/main/java/com/techstore/product/ProductRepository.java`
```java
package com.techstore.product;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
}
```

**Check:** `./mvnw spring-boot:run` boots without a Flyway checksum/migration error and logs `Successfully applied 1 migration`.

### 3. Expose the products endpoint

**Why:** this is the one route the whole phase exists to prove works end-to-end.

`backend/src/main/java/com/techstore/product/ProductController.java`
```java
package com.techstore.product;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:5173")   // ← Vite dev server origin
public class ProductController {

    private final ProductRepository repository;

    public ProductController(ProductRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Product> list() {
        return repository.findAll();
    }
}
```

**Check:** with the app running, `curl http://localhost:8080/api/products` returns a JSON array of the 4 seeded products.

### 4. Add Tailwind and the dark theme baseline

**Why:** the whole product's identity is the dark console-style tile grid — setting the visual tone in Phase 1 means every later phase builds on top of it instead of retrofitting it in.

```bash
cd frontend
npm install tailwindcss @tailwindcss/vite
```

`frontend/vite.config.ts`
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'   // ←

export default defineConfig({
  plugins: [react(), tailwindcss()],           // ←
})
```

`frontend/src/index.css` (replace contents)
```css
@import "tailwindcss";

@theme {
  --color-bg: #0a0a0a;
  --color-surface: #16181c;
  --color-accent: #3ddc84;   /* green accent, spec-mandated, not Xbox's exact green */
}

body {
  background-color: var(--color-bg);
  color: white;
  font-family: system-ui, sans-serif;
}
```

**Check:** `npm run dev` starts with no CSS build errors.

### 5. Fetch and render the grid

**Why:** this is the payoff — the actual "one command, visible result" moment.

`frontend/src/types/product.ts`
```ts
export interface Product {
  id: number
  name: string
  description: string
  priceCents: number
  stock: number
  imageUrl: string
}
```

`frontend/src/api/client.ts`
```ts
const API_BASE = 'http://localhost:8080/api'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}
```

`frontend/src/api/products.ts`
```ts
import { apiGet } from './client'
import type { Product } from '../types/product'

export function fetchProducts(): Promise<Product[]> {
  return apiGet<Product[]>('/products')
}
```

`frontend/src/components/ProductCard.tsx`
```tsx
import type { Product } from '../types/product'

export function ProductCard({ product }: { product: Product }) {
  const price = (product.priceCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  return (
    <div className="bg-[var(--color-surface)] rounded-xl overflow-hidden transition-transform hover:scale-105 hover:ring-2 hover:ring-[var(--color-accent)]">
      <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover" />
      <div className="p-4">
        <h3 className="font-semibold">{product.name}</h3>
        <p className="text-sm text-gray-400">{price}</p>
        <p className="text-xs text-gray-500">{product.stock > 0 ? 'In stock' : 'Out of stock'}</p>
      </div>
    </div>
  )
}
```

`frontend/src/components/ProductGrid.tsx`
```tsx
import { useEffect, useState } from 'react'
import { fetchProducts } from '../api/products'
import type { Product } from '../types/product'
import { ProductCard } from './ProductCard'

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts().then(setProducts).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-red-400 p-8">Failed to load products: {error}</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
```

`frontend/src/App.tsx` (replace contents)
```tsx
import { ProductGrid } from './components/ProductGrid'

function App() {
  return (
    <main className="min-h-screen">
      <header className="p-6 text-xl font-bold tracking-tight">TechStore</header>
      <ProductGrid />
    </main>
  )
}

export default App
```

**Check:** browser at `http://localhost:5173` shows the 4 seeded products as dark tiles with hover glow.

## Verify it works

```bash
docker compose up -d postgres
(cd backend && ./mvnw spring-boot:run &)
(cd frontend && npm run dev &)
curl -s http://localhost:8080/api/products | head -c 200
```
Expected:
```
[{"id":1,"name":"ROG Strix G16","description":"16\" gaming laptop, RTX 4070, 32GB RAM","priceCents":149900,"stock":12,"imageUrl":"https://placehold.co/600x400"}, ...
```
And `http://localhost:5173` in a browser shows the tile grid with hover-scale + green ring.

## Definition of done

- [ ] `docker compose up -d postgres` + backend + frontend, then loading `localhost:5173`, shows real DB products
- [ ] Editing a row in the `products` table (via `psql` or a GUI) and refreshing the page reflects the change — nothing is hardcoded on the frontend
- [ ] `GET /api/products` returns valid JSON with no CORS error in the browser console
- [ ] Committed

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| Frontend console: `CORS policy` error | `@CrossOrigin` origin doesn't match Vite's actual port | Confirm Vite is on `5173` (`npm run dev` output) or update `@CrossOrigin` |
| Backend fails to start: `Flyway checksum mismatch` | Edited a migration file after it already ran | Never edit an applied migration — add a new `V2__...sql` instead, or drop the local DB volume (`docker compose down -v`) since it's dev-only data |
| `Connection refused` on `5432` | Postgres container not up yet | `docker compose up -d postgres` then wait a few seconds before starting the backend |
| Blank white page, no tiles | `npm install tailwindcss @tailwindcss/vite` not run, or Vite not restarted after `vite.config.ts` change | Reinstall, restart `npm run dev` |

## Deliberately NOT in this phase

- Cart, checkout, any write endpoint → Phase 2+
- Auth / login → Phase 3
- Search, filters, pagination → Phase 6
- Keyboard/gamepad tile navigation, cinematic transitions → Phase 9
- Any Docker container for the backend/frontend apps themselves → Phase 10

## Commit

```bash
git add docker-compose.yml backend frontend
git commit -m "phase 1: browse a real product catalog end-to-end"
```
