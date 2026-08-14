# Phase 8 — Live notifications over WebSockets

**Goal:** When an admin changes an order's status, the customer who placed it sees the update appear in their open tab instantly, with no refresh; admins see a live low-stock alert when a checkout drops a product below a threshold.
**Time:** ~4h · **Difficulty:** ●●●○○
**Depends on:** Phase 6 complete (admin order status) and Phase 4 (stock changes on checkout)

## ✅ What you'll have when this is done

A Spring `STOMP`-over-WebSocket endpoint at `/ws`, a per-user topic (`/topic/orders/{userId}`) the backend publishes to whenever `OrderService`/the admin status-update endpoint changes an order, and a frontend `useEffect` that subscribes and shows a toast.

```bash
# terminal A: browser tab logged in as the customer, on /orders
# terminal B:
$ curl -X PATCH localhost:8080/api/orders/1/status -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' -d '{"status":"SHIPPED"}'
```
The customer's open tab shows a toast "Order #1 is now SHIPPED" within ~1 second, and the order list re-renders — no page reload.

## Why this phase now

Real-time only pays off once there's something worth pushing — order status (Phase 4/6) and stock (Phase 4) already exist, so this phase is pure "wire up the push," not "invent new state to push." Doing it before the UI polish phase (9) means Phase 9 can build its notification *animations* on top of a working data channel instead of building both at once.

## Before you start

```bash
cd frontend && npm install @stomp/stompjs sockjs-client
cd backend  # add spring-boot-starter-websocket to pom.xml
```

## Files in this phase

```
backend/src/main/java/com/techstore/
├── ws/WebSocketConfig.java              ← NEW
├── order/OrderService.java              ← MODIFIED  publish on status change
└── order/OrderController.java           ← MODIFIED  publish on admin status update
frontend/src/
├── ws/socket.ts                          ← NEW
├── hooks/useOrderNotifications.ts        ← NEW
└── components/Toast.tsx                  ← NEW
```

## Steps

### 1. Enable STOMP over WebSocket

`backend/src/main/java/com/techstore/ws/WebSocketConfig.java`
```java
package com.techstore.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");   // ← in-memory broker; Redis Pub/Sub swap-in is Phase 10+ if scaling out
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOrigins("http://localhost:5173")
            .withSockJS();   // ← fallback for environments that block raw WebSocket
    }
}
```

### 2. Publish on order status change

**Why:** the publish must happen at the single place status actually changes, not duplicated across every caller — otherwise some transition paths silently forget to notify.

`backend/src/main/java/com/techstore/order/OrderService.java` (add)
```java
private final SimpMessagingTemplate messaging;   // ← inject via constructor

public Order updateStatus(Long orderId, OrderStatus newStatus) {
    Order order = orders.findById(orderId).orElseThrow();
    order.setStatus(newStatus);
    orders.save(order);
    messaging.convertAndSend(
        "/topic/orders/" + order.getUserId(),
        new OrderStatusEvent(order.getId(), order.getStatus().name())
    );   // ← the actual push
    return order;
}

public record OrderStatusEvent(Long orderId, String status) {}
```

Move the Phase 6 admin `PATCH /api/orders/{id}/status` endpoint's logic into this method so there's exactly one status-change path.

For low-stock: in the checkout `for` loop (Phase 4's `OrderService.checkout`), after `product.setStock(...)`, add:
```java
if (product.getStock() < 5) {
    messaging.convertAndSend("/topic/admin/low-stock",
        new LowStockEvent(product.getId(), product.getName(), product.getStock()));
}
```

### 3. Subscribe from the frontend

`frontend/src/ws/socket.ts`
```ts
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export function connectSocket(): Client {
  const client = new Client({
    webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
    reconnectDelay: 3000,   // ← auto-reconnect if the connection drops
  })
  client.activate()
  return client
}
```

`frontend/src/hooks/useOrderNotifications.ts`
```ts
import { useEffect } from 'react'
import { connectSocket } from '../ws/socket'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export function useOrderNotifications(userId: number | null) {
  useEffect(() => {
    if (!userId) return
    const client = connectSocket()
    client.onConnect = () => {
      client.subscribe(`/topic/orders/${userId}`, (message) => {
        const event = JSON.parse(message.body)
        toast(`Order #${event.orderId} is now ${event.status}`)   // ← swap for the richer Toast component in Phase 9
      })
    }
    return () => { client.deactivate() }
  }, [userId])
}
```

Call `useOrderNotifications(userId)` once near the app root (e.g. in a layout component that already knows the logged-in user's id from `/api/me`).

## Verify it works

Open two browser windows: one logged in as the customer on `/orders`, one logged in as admin on `/admin/orders`. Change the order's status from the admin window. Watch the customer window show a toast and update within ~1 second, with no reload.

## Definition of done

- [ ] Status change made anywhere (curl, admin UI) reaches the right customer's open tab, not all tabs
- [ ] A customer never receives another customer's order events (topic is per-user-id, not broadcast)
- [ ] Socket reconnects automatically if the backend restarts mid-session
- [ ] Committed

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| No toast ever arrives | Frontend subscribed before `onConnect` fired, or topic path typo (`/topic/order/` vs `/topic/orders/`) | Only `subscribe` inside `onConnect`; double check the exact topic string matches both sides |
| Customer receives every order's events | Publishing to a shared topic instead of `/topic/orders/{userId}` | Scope the topic per user id |

## Deliberately NOT in this phase

- Redis Pub/Sub broker (needed only once you run multiple backend instances) → Phase 10 note, not required for a single-instance dev/demo deploy
- Rich animated toast/notification tray UI → Phase 9
- Push notifications when the tab is closed (browser Push API/service workers) → bonus

## Commit

```bash
git commit -am "phase 8: live order status + low-stock notifications via WebSocket"
```
