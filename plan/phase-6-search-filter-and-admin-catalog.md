# Phase 6 — Search, filter, sort — and manage the catalog as admin

**Goal:** A shopper can search and filter the catalog by brand/price/stock and sort results; an `ADMIN` user gets a dashboard page to create/edit/delete products, categories, and brands, and to move orders through their status lifecycle.
**Time:** ~5h · **Difficulty:** ●●●○○
**Depends on:** Phase 5 complete

## ✅ What you'll have when this is done

`GET /api/products?search=laptop&brand=Asus&minPrice=500&sort=price,asc&page=0` with Spring Data pagination; `Category`/`Brand` entities properly related to `Product`; an `/admin` route (guarded by `ADMIN` role, both server- and client-side) with a product table supporting create/edit/delete and an orders table supporting status transitions.

```bash
$ curl "localhost:8080/api/products?search=laptop&sort=price,desc"
```
In the browser: type "laptop" in the search bar, results filter live; as an admin, visit `/admin/products`, edit a price, see it reflected on the storefront on refresh.

## Why this phase now

Search/filter/admin CRUD is the first "many similar things get widened at once" phase — it's a natural checkpoint before layering AI (Phase 7, which needs filterable/searchable product data to answer questions grounded in reality) and before real-time admin alerts (Phase 8, which needs the admin order view to exist first).

## Before you start

No new tools — this is Spring Data JPA (`Specification`/`Pageable`) + more React.

## Files in this phase

```
backend/src/main/
├── resources/db/migration/V4__categories_brands.sql   ← NEW
└── java/com/techstore/
    ├── product/
    │   ├── Category.java, Brand.java              ← NEW
    │   ├── Product.java                            ← MODIFIED  add category/brand relations
    │   ├── ProductRepository.java                  ← MODIFIED  extend JpaSpecificationExecutor
    │   ├── ProductSpecifications.java               ← NEW  (search/filter predicates)
    │   └── ProductController.java                   ← MODIFIED  query params, admin CRUD endpoints
    └── order/OrderController.java                   ← MODIFIED  admin status-update endpoint
frontend/src/
├── components/SearchBar.tsx, FilterPanel.tsx        ← NEW
├── pages/admin/AdminProductsPage.tsx, AdminOrdersPage.tsx  ← NEW
└── components/RequireRole.tsx                        ← NEW  (route guard)
```

## Steps

### 1. Categories and brands

`backend/src/main/resources/db/migration/V4__categories_brands.sql`
```sql
CREATE TABLE categories (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE);
CREATE TABLE brands     (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE);

ALTER TABLE products ADD COLUMN category_id BIGINT REFERENCES categories(id);
ALTER TABLE products ADD COLUMN brand_id    BIGINT REFERENCES brands(id);

INSERT INTO categories (name) VALUES ('Laptops'), ('Monitors'), ('Peripherals');
INSERT INTO brands (name) VALUES ('Asus'), ('Dell'), ('Logitech'), ('Lenovo');

UPDATE products SET category_id = 1, brand_id = 1 WHERE name = 'ROG Strix G16';
UPDATE products SET category_id = 2, brand_id = 2 WHERE name = 'UltraSharp 27" 4K';
UPDATE products SET category_id = 3, brand_id = 3 WHERE name = 'MX Master 3S';
UPDATE products SET category_id = 1, brand_id = 4 WHERE name = 'ThinkPad X1 Carbon';
```

Add `@ManyToOne` `category`/`brand` fields to `Product.java` alongside the existing columns.

### 2. Search/filter via Specifications

**Why:** `Specification` composes filters (search term, brand, price range) without an explosion of hand-written repository methods for every combination.

`backend/src/main/java/com/techstore/product/ProductSpecifications.java`
```java
package com.techstore.product;

import org.springframework.data.jpa.domain.Specification;

public class ProductSpecifications {
    public static Specification<Product> nameContains(String term) {
        return (root, query, cb) -> term == null ? null :
            cb.like(cb.lower(root.get("name")), "%" + term.toLowerCase() + "%");
    }

    public static Specification<Product> brandEquals(String brand) {
        return (root, query, cb) -> brand == null ? null :
            cb.equal(root.get("brand").get("name"), brand);
    }

    public static Specification<Product> priceAtLeast(Integer minCents) {
        return (root, query, cb) -> minCents == null ? null :
            cb.greaterThanOrEqualTo(root.get("priceCents"), minCents);
    }
}
```

`ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product>`

`ProductController#list` builds `Specification.where(nameContains(search)).and(brandEquals(brand)).and(priceAtLeast(minPrice))`, passes it plus a `Pageable` (from `@PageableDefault(size = 20) Pageable pageable`, `sort` bound automatically from `?sort=price,asc`) into `repository.findAll(spec, pageable)`.

**Check:** `curl "localhost:8080/api/products?search=think"` returns only the ThinkPad.

### 3. Admin CRUD endpoints

Add `POST`, `PUT /{id}`, `DELETE /{id}` to `ProductController`, each annotated `@PreAuthorize("hasRole('ADMIN')")` (requires `@EnableMethodSecurity` on `SecurityConfig`). Same pattern for an order status-update endpoint: `PATCH /api/orders/{id}/status` body `{"status":"SHIPPED"}`, admin-only, validated against the allowed forward transitions (`PENDING→PAID→SHIPPED→DELIVERED`, or `→CANCELLED` from `PENDING`/`PAID`).

**Check:** `curl -X POST .../api/products -H "Authorization: Bearer $CUSTOMER_TOKEN" ...` → `403`. Same call with an admin token → `201`.

### 4. Frontend search bar + filters + admin pages

`frontend/src/components/SearchBar.tsx` — a debounced text input that updates a `search` query param consumed by `ProductGrid`'s fetch (extend `fetchProducts` to accept `{search, brand, minPrice, sort}` and build the query string).

`frontend/src/components/RequireRole.tsx`
```tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const userRole = useAuthStore((s) => s.role)
  if (userRole !== role) return <Navigate to="/" replace />   // ← client-side gate; server @PreAuthorize is the real one
  return <>{children}</>
}
```

`AdminProductsPage.tsx` — table of products with edit-in-place price/stock fields and a delete button, calling the admin CRUD endpoints. `AdminOrdersPage.tsx` — table of all orders with a status dropdown calling the `PATCH` endpoint.

## Verify it works

```bash
curl "localhost:8080/api/products?search=laptop&sort=priceCents,asc" | jq '.content[].name'
ADMIN_TOKEN=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"..."}' | jq -r .accessToken)
curl -X PATCH localhost:8080/api/orders/1/status -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"SHIPPED"}'
```

## Definition of done

- [ ] Search, brand filter, and price sort all work via query params and update the visible grid
- [ ] A `CUSTOMER` token gets `403` on every admin endpoint; an `ADMIN` token succeeds
- [ ] `/admin/products` and `/admin/orders` are unreachable (redirected) for non-admins in the UI, and rejected server-side even if someone bypasses the UI
- [ ] Committed

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| `@PreAuthorize` silently ignored | Missing `@EnableMethodSecurity` on `SecurityConfig` | Add the annotation |
| Filters combine with AND when you wanted OR (or vice versa) | `Specification.and()`/`.or()` chosen wrong | Re-check the intended semantics — brand+price should be AND, "search across name/description" should be OR internally |

## Deliberately NOT in this phase

- Full analytics dashboard (charts, KPIs, revenue graphs) → Phase 10 area or bonus; this phase is CRUD + order status only
- Product images upload / S3 → bonus (seed data uses placeholder URLs)
- CSV import/export → bonus

## Commit

```bash
git commit -am "phase 6: search, filters, and admin catalog/order management"
```
