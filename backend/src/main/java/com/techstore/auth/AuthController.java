package com.techstore.auth;

import com.techstore.auth.AuthService.AuthResult;
import com.techstore.auth.dto.AuthResponse;
import com.techstore.auth.dto.LoginRequest;
import com.techstore.auth.dto.RegisterRequest;
import com.techstore.auth.dto.UserResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The account endpoints: {@code /register}, {@code /login}, {@code /refresh}, {@code /logout},
 * {@code /me}.
 *
 * <p>This class is the only place in the backend that knows the refresh token travels in a cookie.
 * {@link AuthService} produces tokens as plain strings; the private helpers at the bottom decide how
 * they reach the browser. Keeping that decision in one file is what makes "switch to a different
 * cookie policy in production" a small change.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    /** Cookie name, used when setting it and when reading it back via {@code @CookieValue}. */
    private static final String REFRESH_COOKIE = "refreshToken";

    /**
     * Restricting the cookie to this path means the browser attaches it only to {@code /api/auth/*}
     * calls. Fetching the product list does not carry the long-lived token along for no reason —
     * less exposure in logs, proxies, and anything else that sees request headers.
     */
    private static final String REFRESH_COOKIE_PATH = "/api/auth";

    private final AuthService authService;
    private final JwtService jwtService;

    /**
     * {@code POST /api/auth/register} — create an account and sign in immediately.
     *
     * <p>{@code @Valid} runs the constraints on {@link RegisterRequest} before this method body
     * executes; failures become a 400 via {@code GlobalExceptionHandler}. Returns
     * <strong>201 Created</strong> rather than 200 because a new resource now exists.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return authenticated(authService.register(request), HttpStatus.CREATED);
    }

    /** {@code POST /api/auth/login} — exchange email and password for tokens. */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return authenticated(authService.login(request), HttpStatus.OK);
    }

    /**
     * {@code POST /api/auth/refresh} — swap the refresh cookie for a new access token.
     *
     * <p>The frontend calls this in two situations: on page load, to restore a session (the access
     * token was in memory and died with the old page), and when a request comes back 401 because the
     * access token expired mid-session.
     *
     * <p>{@code required = false} matters: a first-time visitor has no cookie, and that should be a
     * clean 401 "Not signed in" rather than a 400 about a missing parameter.
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        return authenticated(authService.refresh(refreshToken), HttpStatus.OK);
    }

    /**
     * {@code POST /api/auth/logout} — clear the refresh cookie.
     *
     * <p>There is no server-side state to delete: a JWT is valid because its signature checks out,
     * not because we recorded it anywhere. So "logging out" is (a) overwriting the cookie with an
     * empty, already-expired one, and (b) the frontend dropping the in-memory access token. The
     * access token itself stays technically valid until it expires — the reason we keep its lifetime
     * to minutes. Genuine instant revocation needs a denylist, which Phase 10 can add with Redis.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity
                .noContent()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie("", Duration.ZERO).toString())
                .build();
    }

    /**
     * {@code GET /api/auth/me} — who am I?
     *
     * <p>Requires a valid access token: it is covered by {@code anyRequest().authenticated()} in
     * {@code SecurityConfig}, so without one the request never reaches this method and returns 401.
     *
     * <p>{@code @AuthenticationPrincipal} pulls out the {@link AuthenticatedUser} that
     * {@code JwtAuthenticationFilter} placed in the security context.
     */
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return authService.currentUser(principal);
    }

    /**
     * Turns an {@link AuthResult} into the HTTP response: access token in the JSON body, refresh
     * token in a {@code Set-Cookie} header.
     *
     * <p>Shared by register, login and refresh so all three are guaranteed to set the cookie the same
     * way. The subtle bug this prevents is one path forgetting the cookie entirely, which looks fine
     * until the user reloads and is silently logged out.
     */
    private ResponseEntity<AuthResponse> authenticated(AuthResult result, HttpStatus status) {
        ResponseCookie cookie = buildRefreshCookie(result.refreshToken(), jwtService.getRefreshTokenTtl());

        return ResponseEntity
                .status(status)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new AuthResponse(
                        result.accessToken(),
                        jwtService.getAccessTokenTtl().toSeconds(),
                        result.user()));
    }

    /**
     * Builds the refresh cookie. Called with a real token to sign in, and with an empty value and
     * {@link Duration#ZERO} to sign out.
     */
    private ResponseCookie buildRefreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)

                // The important one. JavaScript cannot read an HttpOnly cookie -- document.cookie
                // simply does not show it. So even a successful XSS attack cannot steal the
                // long-lived token, which is the whole reason we are not using localStorage.
                .httpOnly(true)

                // TODO Phase 10: must become true in production. `secure` tells the browser to send
                // the cookie over HTTPS only. It has to be false here because local dev is plain
                // http, and a secure cookie over http is silently dropped.
                .secure(false)

                // "Lax" blocks the cookie on cross-site requests, which stops other websites using
                // it. It still works in dev because cookie "sites" ignore the port: localhost:5173
                // and localhost:8080 are the same site. Once the frontend and API sit on genuinely
                // different domains this must become sameSite("None") -- which the browser only
                // accepts together with secure(true).
                .sameSite("Lax")

                .path(REFRESH_COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }
}
