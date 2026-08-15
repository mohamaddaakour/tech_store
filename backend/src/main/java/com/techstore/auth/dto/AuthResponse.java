package com.techstore.auth.dto;

/**
 * The success body for register, login and refresh.
 *
 * <p>Notice the refresh token is <strong>not</strong> here. It goes back in a {@code Set-Cookie}
 * header instead, flagged HttpOnly, so JavaScript can never read it. Putting it in this JSON would
 * hand it to any XSS payload on the page — which would be a 30-day account takeover rather than a
 * 15-minute one.
 *
 * @param accessToken      the short-lived bearer token. The frontend keeps this in memory (a Zustand
 *                         store) and attaches it to every request via an axios interceptor.
 * @param expiresInSeconds lifetime of {@code accessToken}. Sent so the client can refresh
 *                         <em>proactively</em>, just before expiry, instead of waiting to be
 *                         surprised by a 401 mid-checkout. Seconds (not an absolute timestamp)
 *                         because it needs no agreement about clock skew between server and browser.
 * @param user             who just logged in, so the UI can render the email and gate admin-only
 *                         controls without decoding the token itself.
 */
public record AuthResponse(String accessToken, long expiresInSeconds, UserResponse user) {
}
