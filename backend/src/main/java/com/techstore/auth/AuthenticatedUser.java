package com.techstore.auth;

/**
 * Who is making the current request, as read from a verified access token.
 *
 * <p>This is the Spring Security "principal". {@code JwtAuthenticationFilter} builds one per
 * request and puts it in the {@code SecurityContext}; controllers then receive it by declaring a
 * parameter:
 *
 * <pre>
 * &#64;GetMapping("/me")
 * public UserResponse me(&#64;AuthenticationPrincipal AuthenticatedUser principal) { ... }
 * </pre>
 *
 * <p>Two deliberate properties:
 * <ul>
 *   <li><strong>It is not the {@link User} entity.</strong> Building this from the token means the
 *       common case — an authenticated request — costs zero database queries. It also means a
 *       password hash is never sitting in the security context.</li>
 *   <li><strong>It is a record, so it is immutable.</strong> Nothing downstream can quietly
 *       escalate its own role mid-request.</li>
 * </ul>
 *
 * <p>Because the data comes from the token rather than the database, it is a snapshot from when the
 * token was issued. Anything that must be current — "was this account deleted?", "was this user
 * demoted?" — has to re-read the database, which is exactly what {@code AuthService.refresh(...)}
 * and {@code AuthService.currentUser(...)} do.
 */
public record AuthenticatedUser(Long id, String email, Role role) {
}
