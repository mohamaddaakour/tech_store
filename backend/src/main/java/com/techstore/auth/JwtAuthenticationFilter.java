package com.techstore.auth;

import com.techstore.common.ApiException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Runs on every request, before the controller: "is there a valid access token on this request, and
 * if so, who does it belong to?"
 *
 * <p>This is the bridge between our JWTs and Spring Security. Spring Security decides access by
 * looking at the {@code SecurityContext}; nothing populates that for a token-based API unless we do
 * it here. Set the context and {@code .authenticated()} rules pass; leave it empty and they 401.
 *
 * <p>Extending {@link OncePerRequestFilter} guarantees the logic runs exactly once per request even
 * when the servlet container internally forwards or dispatches it — otherwise an error-page forward
 * would re-run token parsing.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** The scheme name from RFC 6750. The trailing space is part of it: {@code Bearer <token>}. */
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());

            try {
                // Rejects tampered, expired, and refresh-type tokens. See JwtService.parse.
                AuthenticatedUser user = jwtService.parse(token, TokenType.ACCESS);

                // The three arguments are: the principal (who), credentials (null -- we have no
                // password here and do not want one lingering in memory), and the authorities that
                // hasRole(...) / .authenticated() will be checked against.
                var authentication = new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        List.of(new SimpleGrantedAuthority(user.role().asAuthority())));

                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (ApiException ex) {
                // A bad token is treated exactly like no token: we leave the context empty and carry
                // on. We do NOT write a 401 here, because that would also block genuinely public
                // routes -- someone browsing /api/products with a stale token from yesterday should
                // still see the catalog. The 401 is produced later, and only if the route actually
                // required authentication, by the entry point in SecurityConfig.
                SecurityContextHolder.clearContext();
            }
        }

        // Always continue the chain. Forgetting this line makes every request hang and return an
        // empty 200 -- a classic and very confusing servlet filter bug.
        filterChain.doFilter(request, response);
    }
}
