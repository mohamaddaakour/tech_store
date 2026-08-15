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

/**
 * Creates and verifies JSON Web Tokens. The only class in the app that knows how a token is built.
 *
 * <h2>What a JWT actually is</h2>
 * Three base64 chunks joined by dots: {@code header.payload.signature}. The header and payload are
 * <em>encoded, not encrypted</em> — paste any token into jwt.io and you can read it. So:
 * <ul>
 *   <li>Never put a secret in a token. Email and role are fine; a password or card number is not.</li>
 *   <li>The signature is what matters. It is an HMAC-SHA256 of the first two chunks using our
 *       {@code app.jwt.secret}. Change one character of the payload and the signature no longer
 *       matches, so we reject it. That is why a client cannot promote itself to
 *       {@code "role": "ADMIN"} — it cannot produce a valid signature without the secret.</li>
 * </ul>
 *
 * <h2>Why two tokens instead of one</h2>
 * It is the standard answer to a genuine conflict: a token cannot be un-issued (nothing to delete —
 * we verify it by signature, not by looking it up), yet users should not have to log in every 15
 * minutes.
 * <ul>
 *   <li>The <strong>access</strong> token is short-lived, so a stolen one expires quickly, and it
 *       lives in JS memory where it dies on tab close.</li>
 *   <li>The <strong>refresh</strong> token is long-lived, but sits in an HttpOnly cookie that
 *       JavaScript cannot read, and is only ever sent to {@code /api/auth/*}.</li>
 * </ul>
 */
@Service
public class JwtService {

    /** Claim names. Constants because they are written in one method and read in another. */
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_TYPE = "typ";

    private final SecretKey key;

    /** Exposed via Lombok's {@code @Getter} so {@code AuthController} can tell clients the lifetimes. */
    @Getter
    private final Duration accessTokenTtl;

    @Getter
    private final Duration refreshTokenTtl;

    /**
     * Derives the signing key once at startup rather than per request — key derivation is
     * deliberately not free, and the key never changes while the app runs.
     *
     * <p>{@code Keys.hmacShaKeyFor} throws if the secret is shorter than 32 bytes. {@link JwtProperties}
     * already enforces that with {@code @Size(min = 32)}, so a weak secret fails at startup with a
     * readable message instead of here with a cryptography error.
     */
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

    /**
     * Builds and signs a token.
     *
     * <p>The {@code subject} is the user's id, not their email. Ids never change; emails can. If the
     * subject were an email, every already-issued token would point at the wrong row (or nothing)
     * the moment a user updated their address.
     */
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

    /**
     * Verifies a token and returns who it belongs to.
     *
     * <p>{@code parseSignedClaims} does the security-critical work: it recomputes the signature with
     * our key and rejects the token if it does not match, and it rejects an {@code exp} in the past.
     * Both failures arrive as a {@link JwtException}.
     *
     * @param expectedType the type this call site requires. Verifying the signature alone is not
     *                     enough — see {@link TokenType} for the attack that check prevents.
     * @throws UnauthorizedException if the token is tampered with, expired, malformed, or of the
     *                               wrong type. All four collapse into one vague message on purpose:
     *                               telling a caller <em>why</em> verification failed helps them
     *                               probe the system.
     */
    public AuthenticatedUser parse(String token, TokenType expectedType) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!expectedType.name().equals(claims.get(CLAIM_TYPE, String.class))) {
                throw new UnauthorizedException("Invalid or expired token");
            }

            return new AuthenticatedUser(
                    Long.valueOf(claims.getSubject()),
                    claims.get(CLAIM_EMAIL, String.class),
                    Role.valueOf(claims.get(CLAIM_ROLE, String.class)));

        } catch (JwtException | IllegalArgumentException ex) {
            // JwtException      -> bad signature, expired, or structurally invalid.
            // IllegalArgumentException -> subject was not a number, or role was not a known enum
            //                             constant (NumberFormatException extends it).
            throw new UnauthorizedException("Invalid or expired token");
        }
    }
}
