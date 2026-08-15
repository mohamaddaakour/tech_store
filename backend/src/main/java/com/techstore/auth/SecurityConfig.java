package com.techstore.auth;

import com.techstore.common.ApiError;
import com.techstore.config.CorsProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tools.jackson.databind.ObjectMapper;

/**
 * The security rules for the whole API: who can reach what, and how requests are authenticated.
 *
 * <p>Worth knowing before reading on: the moment {@code spring-boot-starter-security} is on the
 * classpath, Spring Security locks down <strong>every</strong> endpoint by default. That is why this
 * class is required rather than optional — without it the product grid would start returning 401 and
 * the frontend would look broken. Anything meant to stay public has to be listed below explicitly.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsProperties corsProperties;

    /**
     * Injected rather than constructed with {@code new ObjectMapper()} on purpose: this is the
     * instance Spring Boot configured, so it already knows how to write {@code Instant} as an
     * ISO-8601 string. A fresh one would render the timestamp in {@link ApiError} as an ugly numeric
     * array.
     *
     * <p>Note the import: {@code tools.jackson.databind.ObjectMapper}. Spring Boot 4 ships
     * <strong>Jackson 3</strong>, which moved every package from {@code com.fasterxml.jackson.*} to
     * {@code tools.jackson.*}. Copying a Boot 3 snippet that imports the old package fails to
     * compile with "package does not exist". (Annotations are the exception — {@code @JsonInclude}
     * and friends deliberately kept their original {@code com.fasterxml.jackson.annotation}
     * package, which is why {@code ApiError} still imports from there.)
     */
    private final ObjectMapper objectMapper;

    /**
     * Defines the filter chain — read the {@code authorizeHttpRequests} block top-to-bottom, because
     * the <strong>first matching rule wins</strong>. Putting {@code anyRequest()} anywhere but last
     * would shadow everything after it.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   CorsConfigurationSource corsConfigurationSource)
            throws Exception {

        http
                // Let the browser at localhost:5173 talk to us. See corsConfigurationSource() below.
                .cors(cors -> cors.configurationSource(corsConfigurationSource))

                // CSRF protection defends against a malicious site making the browser send a request
                // using cookies it automatically attaches. Our authenticated requests are authorised
                // by an Authorization header, which a third-party site cannot set on our behalf, so
                // there is nothing for CSRF to protect. The one cookie we do use (the refresh token)
                // is scoped to /api/auth and only yields an access token in a response body that the
                // attacker's page is forbidden by CORS from reading.
                .csrf(csrf -> csrf.disable())

                // Never create an HTTP session. The token on each request is the complete story of
                // who the caller is, which is what lets us run many backend instances behind a load
                // balancer with no shared session store.
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(requests -> requests
                        // Browsers send an unauthenticated OPTIONS "preflight" before any
                        // cross-origin POST. Blocking it would break every request before it starts.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Public: you cannot present a token before you have one.
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/login",
                                "/api/auth/refresh", "/api/auth/logout").permitAll()

                        // Public, but read-only: browsing the catalog needs no account. Writes to
                        // /api/products are not listed, so they fall through to the ADMIN rule and
                        // anyRequest() below. Phase 6 adds those endpoints.
                        .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/**").permitAll()

                        // Role-based access control. hasRole("ADMIN") checks for the authority
                        // "ROLE_ADMIN" -- the prefix is added for you here, which is why
                        // Role.asAuthority() adds it when building the authority in the filter.
                        .requestMatchers("/api/admin/**").hasRole(Role.ADMIN.name())

                        // Everything else -- /api/auth/me, and every cart and order endpoint arriving
                        // in Phase 4 -- needs a valid access token. Defaulting to "deny" means a new
                        // controller is private until someone deliberately opens it up, rather than
                        // accidentally public.
                        .anyRequest().authenticated())

                // Without these, a rejected request returns an empty body and the frontend has
                // nothing to show the user. Now failures use the same ApiError shape as everything else.
                .exceptionHandling(handling -> handling
                        // No token, or an unusable one, on a route that required one.
                        .authenticationEntryPoint((request, response, authException) ->
                                writeError(request, response, HttpStatus.UNAUTHORIZED,
                                        "You need to sign in to do that"))
                        // Valid token, but the wrong role.
                        .accessDeniedHandler((request, response, deniedException) ->
                                writeError(request, response, HttpStatus.FORBIDDEN,
                                        "You do not have permission to do that")))

                // Slot our filter in ahead of the built-in username/password filter so the
                // SecurityContext is already populated by the time the authorization rules above are
                // evaluated. Register it after, and every authenticated request would be rejected.
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * How passwords are hashed. {@link BCryptPasswordEncoder} is the sane default: it salts each
     * password automatically and is deliberately slow (~100ms), which barely matters for one login
     * but makes brute-forcing a stolen database table impractical.
     *
     * <p>Exposing it as a bean means {@code AuthService} depends on the {@link PasswordEncoder}
     * interface, so switching to Argon2 later is a one-line change here and nowhere else.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Cross-Origin Resource Sharing. The frontend is served from {@code localhost:5173} and this API
     * from {@code localhost:8080}; different ports mean different <em>origins</em>, so the browser
     * blocks the call unless we return headers saying it is allowed.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Exact origins, never "*". Combining a wildcard origin with credentials is forbidden by the
        // CORS spec, and the browser would silently drop our refresh cookie.
        configuration.setAllowedOrigins(corsProperties.allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));

        // The half of the cookie contract that lives on the server. The frontend must also opt in
        // with axios' `withCredentials: true`; if either side forgets, the refresh cookie is never
        // stored or sent and sessions mysteriously end after 15 minutes.
        configuration.setAllowCredentials(true);

        // Let the browser cache the preflight result instead of re-asking before every POST.
        configuration.setMaxAge(Duration.ofHours(1));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Writes an {@link ApiError} directly to the raw response.
     *
     * <p>These two failures happen inside the filter chain, before Spring MVC is involved, so
     * {@code GlobalExceptionHandler} never sees them — we have to serialize the body by hand.
     */
    private void writeError(HttpServletRequest request,
                            HttpServletResponse response,
                            HttpStatus status,
                            String message) throws IOException {

        response.setStatus(status.value());
        response.setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(),
                ApiError.of(status, message, request.getRequestURI()));
    }
}
