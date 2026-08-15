package com.techstore.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Type-safe view of the {@code app.jwt.*} settings in {@code application.yml}.
 *
 * <p>Why a properties class instead of {@code @Value("${app.jwt.secret}")} scattered around:
 * <ul>
 *   <li>All token settings are visible in one place.</li>
 *   <li>{@code @Validated} + the constraints below mean a missing or too-short secret fails the
 *       application at <em>startup</em> with a clear message, instead of at 3am on the first
 *       login attempt.</li>
 *   <li>Durations are real {@link Duration} objects, so the YAML can say {@code 15m} / {@code 30d}
 *       instead of a bare number whose unit you have to guess.</li>
 * </ul>
 *
 * <p>Picked up by {@code @ConfigurationPropertiesScan} on the main application class.
 *
 * @param secret         signing key for HMAC-SHA256. Must be at least 32 characters (256 bits) —
 *                       the algorithm refuses anything shorter. Comes from the {@code JWT_SECRET}
 *                       environment variable; never commit a real one.
 * @param accessTokenTtl how long an access token stays valid. Keep this short (minutes): it is
 *                       sent on every request and cannot be revoked once issued.
 * @param refreshTokenTtl how long the refresh token in the HttpOnly cookie stays valid. This is
 *                       effectively "how long until the user must log in again".
 */
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(

        @NotBlank(message = "app.jwt.secret must be set (see JWT_SECRET in backend/.env)")
        @Size(min = 32, message = "app.jwt.secret must be at least 32 characters for HMAC-SHA256")
        String secret,

        Duration accessTokenTtl,

        Duration refreshTokenTtl) {
}
