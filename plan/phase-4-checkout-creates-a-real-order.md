# Phase 4 — Checkout creates a real, stock-safe order

**Goal:** A logged-in shopper clicks "Checkout" on their cart and it becomes a persisted `Order` with `OrderItem` rows, decremented product stock, and a status they can see on an "Order history" page.
**Time:** ~4h · **Difficulty:** ●●●○○
**Depends on:** Phase 3 complete

## ✅ What you'll have when this is done

`POST /api/orders` that takes the current cart, validates stock, creates the order transactionally, decrements stock, and clears the cart — all inside one `@Transactional` method so a mid-checkout crash can't leave stock decremented with no order, or vice versa.

```bash
$ curl -X POST localhost:8080/api/orders -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"lines":[{"productId":1,"quantity":2}]}'
{"id":1,"status":"PENDING","totalCents":299800,...}
```
In the browser: add items to cart → Checkout → redirected to "Order #1 — PENDING" → "My Orders" page lists it.

## Why this phase now

This is the load-bearing transaction of the whole app — the spec explicitly calls out preventing overselling as an interview-ready topic. Getting it right (with a real concurrency-safety choice) before Stripe (Phase 5) touches it means payment logic never has to double as inventory logic.

## Before you start

Decide locking strategy now: this phase uses **optimistic locking** (`@Version` on `Product`) — simpler than pessimistic row locks, and correct because a `StaleObjectStateException`/conflict on checkout is rare and just needs a retry-or-fail response, not a queue.

## Files in this phase

```
backend/src/main/
├── resources/db/migration/V3__create_orders_tables.sql   ← NEW
└── java/com/techstore/
    ├── product/Product.java             ← MODIFIED  add @Version
    ├── order/
    │   ├── Order.java                   ← NEW
    │   ├── OrderItem.java                ← NEW
    │   ├── OrderStatus.java              ← NEW  (enum)
    │   ├── OrderRepository.java          ← NEW
    │   ├── OrderService.java             ← NEW  (the transactional core)
    │   └── OrderController.java          ← NEW
frontend/src/
├── api/orders.ts                        ← NEW
├── components/CartDrawer.tsx            ← MODIFIED  add Checkout button
└── pages/OrderHistoryPage.tsx           ← NEW
```

## Steps

### 1. Orders schema + optimistic-locked stock

`backend/src/main/resources/db/migration/V3__create_orders_tables.sql`
```sql
ALTER TABLE products ADD COLUMN version INTEGER NOT NULL DEFAULT 0;  -- ← optimistic lock column

CREATE TABLE orders (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_cents  INTEGER NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT NOT NULL REFERENCES orders(id),
    product_id  BIGINT NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL,
    price_cents INTEGER NOT NULL   -- ← snapshot the price at purchase time, don't rejoin to products later
);
```

`backend/src/main/java/com/techstore/product/Product.java` (add field)
```java
@Version   // ← JPA bumps this on every UPDATE; concurrent checkouts on the same row will conflict, not silently oversell
private Integer version;
```

`backend/src/main/java/com/techstore/order/OrderStatus.java`
```java
package com.techstore.order;

public enum OrderStatus { PENDING, PAID, SHIPPED, DELIVERED, CANCELLED }
```

`backend/src/main/java/com/techstore/order/Order.java`
```java
package com.techstore.order;

import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter; import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "orders")
@Getter @Setter @NoArgsConstructor
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "total_cents")
    private Integer totalCents;

    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "orderId", cascade = CascadeType.ALL)
    private List<OrderItem> items = new ArrayList<>();
}
```

`backend/src/main/java/com/techstore/order/OrderItem.java`
```java
package com.techstore.order;

import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter; import lombok.NoArgsConstructor;

@Entity @Table(name = "order_items")
@Getter @Setter @NoArgsConstructor
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "product_id")
    private Long productId;

    private Integer quantity;

    @Column(name = "price_cents")
    private Integer priceCents;   // ← snapshotted, not looked up later
}
```

### 2. The transactional checkout

**Why:** this method is the one place stock and orders must move together — if it's not `@Transactional`, a crash between "decrement stock" and "save order" corrupts inventory.

`backend/src/main/java/com/techstore/order/OrderService.java`
```java
package com.techstore.order;

import com.techstore.product.Product;
import com.techstore.product.ProductRepository;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class OrderService {
    private final ProductRepository products;
    private final OrderRepository orders;

    public OrderService(ProductRepository products, OrderRepository orders) {
        this.products = products; this.orders = orders;
    }

    public record LineRequest(Long productId, Integer quantity) {}

    @Transactional   // ← the whole point of this phase
    public Order checkout(Long userId, List<LineRequest> lines) {
        Order order = new Order();
        order.setUserId(userId);
        int total = 0;

        for (LineRequest line : lines) {
            Product product = products.findById(line.productId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown product " + line.productId()));

            if (product.getStock() < line.quantity())
                throw new IllegalStateException("Not enough stock for " + product.getName());

            product.setStock(product.getStock() - line.quantity());
            products.save(product);   // ← throws ObjectOptimisticLockingFailureException on version conflict

            OrderItem item = new OrderItem();
            item.setProductId(product.getId());
            item.setQuantity(line.quantity());
            item.setPriceCents(product.getPriceCents());
            order.getItems().add(item);
            total += product.getPriceCents() * line.quantity();
        }

        order.setTotalCents(total);
        return orders.save(order);
    }
}
```

Catch `ObjectOptimisticLockingFailureException` in the controller and return `409 Conflict` with "Someone just bought the last one — please retry" — that's the whole point of choosing optimistic locking: fail loudly and let the client retry, rather than silently overselling.

### 3. Order endpoints

`backend/src/main/java/com/techstore/order/OrderController.java` — `POST /api/orders` (reads the authenticated user from the security context, calls `OrderService.checkout`), `GET /api/orders` (list the current user's orders, newest first). Both require auth (no `permitAll`).

### 4. Frontend: checkout + order history

`frontend/src/api/orders.ts`
```ts
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:8080/api'

export async function checkout(lines: { productId: number; quantity: number }[]) {
  const token = useAuthStore.getState().accessToken
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ lines }),
  })
  if (res.status === 409) throw new Error('An item sold out while you were checking out')
  if (!res.ok) throw new Error('Checkout failed')
  return res.json()
}
```

In `CartDrawer.tsx`, add a "Checkout" button that maps `lines` to `{productId, quantity}`, calls `checkout(...)`, clears the cart store on success, and navigates to `/orders`.

`OrderHistoryPage.tsx` fetches `GET /api/orders` and renders a list of `Order #{id} — {status} — ${total}`.

## Verify it works

```bash
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"hunter22"}' | jq -r .accessToken)
curl -X POST localhost:8080/api/orders -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"lines":[{"productId":1,"quantity":2}]}'
curl -s localhost:8080/api/products/1 | jq .stock   # ← should be 2 less than before
```

## Definition of done

- [ ] Checking out decrements stock and creates an order+items in one transaction
- [ ] Checking out for more than available stock returns a clear error, no partial state
- [ ] "My Orders" page shows real orders for the logged-in user only (not other users' orders)
- [ ] Committed

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| Stock goes negative | Missing the `if (stock < quantity) throw` guard, or check happens outside the transaction | Guard must be inside the same `@Transactional` method as the decrement |
| `LazyInitializationException` rendering `order.items` as JSON | `open-in-view: false` (set in Phase 1) + accessing a lazy collection outside the transaction | Fetch items eagerly in the repository query, or map to a DTO inside the service |

## Deliberately NOT in this phase

- Payment / Stripe → Phase 5 (orders start `PENDING`, stay `PENDING` until paid)
- Admin order management UI → Phase 6
- Real-time status push to the customer → Phase 8

## Commit

```bash
git commit -am "phase 4: transactional, stock-safe checkout"
```
