# Phase 3 — Accounts: register, log in, cart follows you

**Goal:** A visitor can register, log in, and stay logged in across a reload; their role (`CUSTOMER` or `ADMIN`) gates what they can see; the guest cart from Phase 2 keeps working for logged-in users too.
**Time:** ~4h · **Difficulty:** ●●●○○
**Depends on:** Phase 2 complete

## ✅ What you'll have when this is done

Spring Security issuing a short-lived JWT access token (returned in the response body, kept in memory on the frontend) plus a refresh token in an HttpOnly cookie. A `users` table with BCrypt-hashed passwords and a `role` column. A login/register form on the frontend, and a protected `/api/me` endpoint.

```bash
$ curl -X POST localhost:8080/api/auth/register -H 'Content-Type: application/json' \
    -d '{"email":"me@example.com","password":"hunter22"}'
$ curl -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
    -d '{"email":"me@example.com","password":"hunter22"}'
{"accessToken":"eyJhbGciOi..."}
```
In the browser: register, get redirected to the store, header shows your email instead of "Log in."

## Why this phase now

Checkout (Phase 4) needs to know *whose* order it is. Doing auth before orders means Phase 4 never has to retrofit a "guest order → claim it later" migration.

## Before you start

Add to `backend/pom.xml`: `spring-boot-starter-security`, `io.jsonwebtoken:jjwt-api`/`jjwt-impl`/`jjwt-jackson` (0.12.x).

## Files in this phase

```
backend/src/main/
├── resources/db/migration/V2__create_users_table.sql   ← NEW
└── java/com/techstore/
    ├── auth/
    │   ├── User.java                 ← NEW
    │   ├── Role.java                 ← NEW  (enum CUSTOMER, ADMIN)
    │   ├── UserRepository.java       ← NEW
    │   ├── JwtService.java           ← NEW
    │   ├── AuthController.java       ← NEW  (/api/auth/register, /login, /refresh)
    │   └── SecurityConfig.java       ← NEW
frontend/src/
├── store/authStore.ts               ← NEW
├── api/auth.ts                      ← NEW
└── components/AuthForm.tsx          ← NEW
```

## Steps

### 1. Users table and entity

`backend/src/main/resources/db/migration/V2__create_users_table.sql`
```sql
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'
);
```

`backend/src/main/java/com/techstore/auth/Role.java`
```java
package com.techstore.auth;

public enum Role { CUSTOMER, ADMIN }
```

`backend/src/main/java/com/techstore/auth/User.java`
```java
package com.techstore.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private Role role = Role.CUSTOMER;
}
```

### 2. JWT issuing and validation

**Why:** access tokens stay in memory (never `localStorage` — XSS-exposed); refresh tokens live in an HttpOnly cookie so JS can't read them, per the spec's explicit requirement.

`backend/src/main/java/com/techstore/auth/JwtService.java`
```java
package com.techstore.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    // ← dev-only key; in Phase 10 this moves to an env var, never committed
    private final SecretKey key = Keys.hmacShaKeyFor(
        "dev-only-secret-key-please-override-in-prod-32bytes!".getBytes());

    public String issueAccessToken(User user) {
        return Jwts.builder()
            .subject(user.getEmail())
            .claim("role", user.getRole().name())
            .issuedAt(Date.from(Instant.now()))
            .expiration(Date.from(Instant.now().plusSeconds(900)))   // ← 15 min
            .signWith(key)
            .compact();
    }

    public String issueRefreshToken(User user) {
        return Jwts.builder()
            .subject(user.getEmail())
            .expiration(Date.from(Instant.now().plusSeconds(60L * 60 * 24 * 30)))  // ← 30 days
            .signWith(key)
            .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
    }
}
```

### 3. Register/login endpoints

`backend/src/main/java/com/techstore/auth/AuthController.java`
```java
package com.techstore.auth;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AuthController {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users; this.encoder = encoder; this.jwt = jwt;
    }

    @PostMapping("/register")
    public Map<String, String> register(@RequestBody AuthRequest req, HttpServletResponse res) {
        if (users.findByEmail(req.email()).isPresent())
            throw new IllegalArgumentException("Email already registered");
        User user = new User();
        user.setEmail(req.email());
        user.setPasswordHash(encoder.encode(req.password()));   // ← BCrypt
        users.save(user);
        return issueTokens(user, res);
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody AuthRequest req, HttpServletResponse res) {
        User user = users.findByEmail(req.email())
            .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
            .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        return issueTokens(user, res);
    }

    private Map<String, String> issueTokens(User user, HttpServletResponse res) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", jwt.issueRefreshToken(user))
            .httpOnly(true).secure(false).path("/api/auth").maxAge(60L * 60 * 24 * 30).build();
        res.addHeader("Set-Cookie", cookie.toString());
        return Map.of("accessToken", jwt.issueAccessToken(user), "role", user.getRole().name());
    }

    public record AuthRequest(String email, String password) {}
}
```

Wire `SecurityConfig` to: permit `/api/auth/**` and `GET /api/products`, require auth elsewhere, register a JWT filter that reads `Authorization: Bearer <token>` and sets the `SecurityContext`, and expose a `PasswordEncoder` bean (`BCryptPasswordEncoder`). This is standard Spring Security boilerplate — follow the official [JWT + Spring Security 6 guide](https://docs.spring.io/spring-security/reference/servlet/authentication/index.html) for the filter chain shape.

### 4. Frontend auth store + form

`frontend/src/store/authStore.ts`
```ts
import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  role: string | null
  setAuth: (accessToken: string, role: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,   // ← intentionally NOT persisted — lives in memory only
  role: null,
  setAuth: (accessToken, role) => set({ accessToken, role }),
  logout: () => set({ accessToken: null, role: null }),
}))
```

`frontend/src/api/auth.ts`
```ts
const API_BASE = 'http://localhost:8080/api'

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',   // ← sends/receives the HttpOnly refresh cookie
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json() as Promise<{ accessToken: string; role: string }>
}
```

Add a minimal `AuthForm.tsx` with email/password inputs calling `login`/register and storing the result via `useAuthStore().setAuth(...)`.

## Verify it works

```bash
curl -i -X POST localhost:8080/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"hunter22"}'
```
Expected: `200 OK`, JSON body with `accessToken`, and a `Set-Cookie: refreshToken=...; HttpOnly` header.

## Definition of done

- [ ] Register + login work via `curl` and via the UI form
- [ ] `GET /api/me` (add a trivial one returning the authenticated user's email) returns 401 without a token, 200 with one
- [ ] Refresh token cookie is `HttpOnly` (confirm in browser devtools → Application → Cookies — JS `document.cookie` cannot read it)
- [ ] Committed

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| `403` on every request after adding Spring Security | Security filter chain defaults to requiring auth on everything, including `/api/products` | Explicitly `permitAll()` the public routes in `SecurityConfig` |
| Cookie never arrives in the browser | `credentials: 'include'` missing on fetch, or CORS `allowCredentials` mismatch | Both frontend fetch and backend `@CrossOrigin`/CORS config must opt in |

## Deliberately NOT in this phase

- Refresh-token rotation endpoint wiring into an axios interceptor → do it here if time allows, otherwise fold into Phase 4's checkout work since that's the first flow that needs a long session
- OAuth (Google/GitHub), email verification, password reset → bonus, not in v1
- Cart migrated to server-side storage per user → optional; guest `localStorage` cart continues to work fine through Phase 4

## Commit

```bash
git commit -am "phase 3: JWT auth with RBAC (CUSTOMER/ADMIN)"
```
