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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE = "refreshToken";

    // The browser only attaches the cookie to /api/auth/* calls, so fetching products
    // does not carry the long lived token along
    private static final String REFRESH_COOKIE_PATH = "/api/auth";

    private final AuthService authService;
    private final JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return authenticated(authService.register(request), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return authenticated(authService.login(request), HttpStatus.OK);
    }

    // required = false, so a first time visitor with no cookie gets a clean 401 instead
    // of a 400 about a missing parameter
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        return authenticated(authService.refresh(refreshToken), HttpStatus.OK);
    }

    // Nothing to delete on the server: a JWT is valid because it is signed, not because
    // we stored it. Logging out clears the cookie and the frontend drops the access token,
    // which stays valid until it expires, hence its short TTL.
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity
                .noContent()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie("", Duration.ZERO).toString())
                .build();
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return authService.currentUser(principal);
    }

    // Shared by register, login and refresh so all three answer the same way: access
    // token in the body, refresh token in the cookie
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

    // Called with a real token to sign in, and with an empty value and Duration.ZERO to sign out
    private ResponseCookie buildRefreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)

                // JavaScript cannot read an HttpOnly cookie, so an XSS cannot steal the
                // refresh token. That is why it does not live in localStorage.
                .httpOnly(true)

                // TODO: must become true in production. The browser drops a secure cookie
                // sent over plain http, and local dev is http.
                .secure(false)

                // Blocks the cookie on cross site requests. Ports do not make different
                // sites, so localhost:5173 and localhost:8080 still work in dev. Real
                // separate domains would need sameSite("None") plus secure(true).
                .sameSite("Lax")

                .path(REFRESH_COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }
}
