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

    // Access toke "time to live": how much the access token will stay alive
    @Getter
    private final Duration accessTokenTtl;

    @Getter
    private final Duration refreshTokenTtl;

    public JwtService(JwtProperties properties) {
        // Turns your raw secret string (e.g. "my-super-secret-key...") into a SecretKey object the crypto library understands
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));

        this.accessTokenTtl = properties.accessTokenTtl();
        this.refreshTokenTtl = properties.refreshTokenTtl();
    }

    public String issueAccessToken(User user) {
        // build a short-lived token for this user
        return issue(user, TokenType.ACCESS, accessTokenTtl);
    }

    public String issueRefreshToken(User user) {
        // build a long-lived token for this user
        return issue(user, TokenType.REFRESH, refreshTokenTtl);
    }

    private String issue(User user, TokenType type, Duration ttl) {
        Instant now = Instant.now();

        return Jwts.builder()
                .subject(String.valueOf(user.getId())) // "subject" is whose token this is (the user's ID)
                .claim(CLAIM_EMAIL, user.getEmail()) // Extra data packed into the token
                .claim(CLAIM_ROLE, user.getRole().name())
                .claim(CLAIM_TYPE, type.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl))) // When it stops being valid
                .signWith(key) // Signs it with the secret
                .compact(); // Turns it into the final string, e.g. "eyJhbGciOiJIUzI1NiJ9..."
    }

    // Verifies the signature, the expiry and the token type, or throws
    public AuthenticatedUser parse(String token, TokenType expectedType) {
        try {
            Claims claims = Jwts.parser() // start building a parser
                    .verifyWith(key) // Checks the signature — proves the token wasn't forged or edited
                    .build() // finalize — turns the builder into a real JwtParser
                    .parseSignedClaims(token) // Also checks expiry automatically, throws if expired
                    .getPayload(); // The actual data inside (subject, email, role, typ...)

            // Reject a valid, unexpired token if it's the wrong kind
            // (e.g. someone tries to use a refresh token to access a protected endpoint)
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
