package com.techstore.auth;

import com.techstore.common.UnauthorizedException;
import com.techstore.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import lombok.Getter;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_TYPE = "typ";

    // Derived once from app.jwt.secret, used for both signing and verifying
    private final SecretKey key;

    @Getter
    private final Duration accessTokenTtl;

    @Getter
    private final Duration refreshTokenTtl;

    public JwtService(JwtProperties properties) {
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtl = properties.accessTokenTtl();
        this.refreshTokenTtl = properties.refreshTokenTtl();
    }

    public String issueAccessToken(User user) {
        return issue(user, TokenType.ACCESS, accessTokenTtl);
    }

    public String issueRefreshToken(User user) {
        return issue(user, TokenType.REFRESH, refreshTokenTtl);
    }

    private String issue(User user, TokenType type, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_ROLE, user.getRole().name())
                .claim(CLAIM_TYPE, type.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    // Verifies the signature, the expiry and the token type, or throws
    public AuthenticatedUser parse(String token, TokenType expectedType) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            // Both types are signed with the same key, so this claim is what keeps them apart
            if (!expectedType.name().equals(claims.get(CLAIM_TYPE, String.class))) {
                throw new UnauthorizedException("Invalid or expired token");
            }

            return new AuthenticatedUser(
                    Long.valueOf(claims.getSubject()),
                    claims.get(CLAIM_EMAIL, String.class),
                    Role.valueOf(claims.get(CLAIM_ROLE, String.class)));

        // One message for every failure: the caller does not need to know which check failed
        } catch (JwtException | IllegalArgumentException ex) {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }
}
