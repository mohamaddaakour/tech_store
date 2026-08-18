package com.techstore.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(

        @NotBlank(message = "app.jwt.secret must be set")
        @Size(min = 32, message = "app.jwt.secret must be at least 32 characters for HMAC-SHA256")
        String secret,

        Duration accessTokenTtl,

        Duration refreshTokenTtl) {
}
