package com.techstore.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

// these data are inside application.yml
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(

        @NotBlank(message = "app.jwt.secret must be set (see JWT_SECRET in backend/.env)")
        @Size(min = 32, message = "app.jwt.secret must be at least 32 characters for HMAC-SHA256")
        String secret,

        Duration accessTokenTtl,

        Duration refreshTokenTtl) {
}
