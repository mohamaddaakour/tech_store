# Phase 5 — Pay with Stripe, order flips to PAID

**Goal:** A shopper completes a real Stripe test-mode checkout for their order, and a Stripe webhook flips the order's status from `PENDING` to `PAID` — driven by Stripe's event, not the browser's redirect (which can be closed/lost).
**Time:** ~4h · **Difficulty:** ●●●○○
**Depends on:** Phase 4 complete

## ✅ What you'll have when this is done

`POST /api/orders/{id}/checkout-session` creates a Stripe Checkout Session and returns its URL; the frontend redirects there; Stripe redirects back to a success page; independently, Stripe calls your webhook, which is the *only* thing allowed to mark the order `PAID`.

```bash
$ stripe listen --forward-to localhost:8080/api/payments/webhook   # terminal 4
$ # complete a checkout in the browser with card 4242 4242 4242 4242
```
Order status on `/orders` flips from `PENDING` to `PAID` within a couple seconds, without you refreshing based on the redirect alone.

## Why this phase now

Payment status must never be decided by "the browser came back to the success URL" — that's spoofable and unreliable (closed tab, network drop). Building the webhook-driven flow now, while the order model is still simple, is far easier than retrofitting it after Phase 6/7 add more order-touching code.

## Before you start

```bash
brew install stripe/stripe-cli/stripe   # or the equivalent for your OS
stripe login
```
Get test-mode keys from the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys) → set as env vars, never commit them:
```bash
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...   # printed by `stripe listen`
```

## Files in this phase

```
backend/src/main/
├── resources/application.yml           ← MODIFIED  read Stripe keys from env
└── java/com/techstore/payment/
    ├── PaymentController.java          ← NEW  (create session)
    └── WebhookController.java          ← NEW  (verify + handle events)
frontend/src/
├── api/payments.ts                     ← NEW
├── pages/CheckoutSuccessPage.tsx       ← NEW
└── components/CartDrawer.tsx           ← MODIFIED  Checkout now redirects to Stripe
```

## Steps

### 1. Add the Stripe SDK and config

`backend/pom.xml`
```xml
<dependency>
    <groupId>com.stripe</groupId>
    <artifactId>stripe-java</artifactId>
    <version>27.2.0</version>
</dependency>
```

`backend/src/main/resources/application.yml` (add)
```yaml
stripe:
  secret-key: ${STRIPE_SECRET_KEY}
  webhook-secret: ${STRIPE_WEBHOOK_SECRET}
```

### 2. Create the Checkout Session

**Why:** Stripe hosts the actual card form — you never touch raw card numbers, which is what keeps you out of PCI-DSS scope.

`backend/src/main/java/com/techstore/payment/PaymentController.java`
```java
package com.techstore.payment;

import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import com.techstore.order.Order;
import com.techstore.order.OrderRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class PaymentController {
    @Value("${stripe.secret-key}") private String secretKey;
    private final OrderRepository orders;

    public PaymentController(OrderRepository orders) { this.orders = orders; }

    @PostConstruct
    void init() { Stripe.apiKey = secretKey; }   // ← set once at startup

    @PostMapping("/{id}/checkout-session")
    public Map<String, String> createSession(@PathVariable Long id) throws Exception {
        Order order = orders.findById(id).orElseThrow();

        SessionCreateParams params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setSuccessUrl("http://localhost:5173/checkout/success?session_id={CHECKOUT_SESSION_ID}")
            .setCancelUrl("http://localhost:5173/cart")
            .putMetadata("orderId", order.getId().toString())   // ← webhook reads this back
            .addLineItem(SessionCreateParams.LineItem.builder()
                .setQuantity(1L)
                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency("usd")
                    .setUnitAmount(order.getTotalCents().longValue())
                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("TechStore order #" + order.getId())
                        .build())
                    .build())
                .build())
            .build();

        Session session = Session.create(params);
        return Map.of("url", session.getUrl());
    }
}
```

### 3. Verify and handle the webhook

**Why:** signature verification is what stops an attacker from POSTing a fake "payment succeeded" event to your endpoint.

`backend/src/main/java/com/techstore/payment/WebhookController.java`
```java
package com.techstore.payment;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.techstore.order.Order;
import com.techstore.order.OrderRepository;
import com.techstore.order.OrderStatus;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/payments")
public class WebhookController {
    @Value("${stripe.webhook-secret}") private String webhookSecret;
    private final OrderRepository orders;

    public WebhookController(OrderRepository orders) { this.orders = orders; }

    @PostMapping("/webhook")
    public String handle(HttpServletRequest request) throws IOException {
        String payload = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        String signature = request.getHeader("Stripe-Signature");

        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, webhookSecret);   // ← throws if forged
        } catch (SignatureVerificationException e) {
            return "invalid signature";   // controller advice maps this to 400 in practice
        }

        if ("checkout.session.completed".equals(event.getType())) {
            Session session = (Session) event.getDataObjectDeserializer().getObject().orElseThrow();
            Long orderId = Long.valueOf(session.getMetadata().get("orderId"));
            Order order = orders.findById(orderId).orElseThrow();
            order.setStatus(OrderStatus.PAID);   // ← the only place an order becomes PAID
            orders.save(order);
        }

        return "ok";
    }
}
```

**Check:** with `stripe listen --forward-to localhost:8080/api/payments/webhook` running, `stripe trigger checkout.session.completed` logs a `200` from your endpoint.

### 4. Frontend: redirect to Stripe, handle success

`frontend/src/api/payments.ts`
```ts
import { useAuthStore } from '../store/authStore'

export async function startCheckoutSession(orderId: number) {
  const token = useAuthStore.getState().accessToken
  const res = await fetch(`http://localhost:8080/api/orders/${orderId}/checkout-session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const { url } = await res.json()
  window.location.href = url   // ← full browser redirect to Stripe-hosted page
}
```

In the cart's checkout handler: call `checkout(lines)` (Phase 4) to create the `PENDING` order, then `startCheckoutSession(order.id)` to redirect. `CheckoutSuccessPage.tsx` just shows "Payment received, check your orders" — actual status comes from the webhook, not this page.

## Verify it works

```bash
stripe listen --forward-to localhost:8080/api/payments/webhook
```
Complete a checkout in the browser using card `4242 4242 4242 4242`, any future expiry, any CVC. Watch the `stripe listen` terminal log `checkout.session.completed → 200`. Refresh `/orders` — status is `PAID`.

## Definition of done

- [ ] A real (test-mode) Stripe Checkout page appears and accepts the test card
- [ ] Order status changes to `PAID` via the webhook, verified by checking the DB directly — not just trusting the success page
- [ ] Forged webhook payloads (wrong signature) are rejected, not processed
- [ ] Committed (webhook/secret keys are in env vars, `.env` is gitignored — never commit them)

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| Webhook returns 400 "invalid signature" | Using the dashboard's webhook secret instead of the one `stripe listen` printed for local forwarding | Use the CLI-provided `whsec_...` for local dev |
| Order never flips to `PAID` | Metadata key mismatch (`orderId` vs `order_id`) between session creation and webhook read | Keep the metadata key identical in both places |

## Deliberately NOT in this phase

- Refunds, partial payments, failed-payment retry flows → bonus
- Admin-triggered status transitions (`SHIPPED`, `DELIVERED`) → Phase 6
- Live push of the status change to the customer's open tab → Phase 8 (for now they see it on refresh/revisit)

## Commit

```bash
git commit -am "phase 5: Stripe checkout + webhook-driven PAID status"
```
