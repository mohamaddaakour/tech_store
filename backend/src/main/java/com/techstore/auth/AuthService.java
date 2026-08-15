package com.techstore.auth;

import com.techstore.auth.dto.LoginRequest;
import com.techstore.auth.dto.RegisterRequest;
import com.techstore.auth.dto.UserResponse;
import com.techstore.common.ConflictException;
import com.techstore.common.UnauthorizedException;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * All the account logic: create an account, prove who you are, get a fresh access token.
 *
 * <p>Deliberately knows nothing about HTTP — no status codes, no cookies, no {@code ResponseEntity}.
 * It takes plain objects and returns an {@link AuthResult}. {@code AuthController} is the only class
 * that translates that into headers and JSON. This is what makes the rules below testable without
 * starting a web server.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * What a successful authentication produces. The refresh token is kept separate from the
     * {@code AuthResponse} DTO precisely because it must not be serialized into the body — keeping it
     * in a different object makes that mistake hard to make by accident.
     */
    public record AuthResult(String accessToken, String refreshToken, UserResponse user) {
    }

    /**
     * Creates an account and logs the new user straight in — nobody wants to type their password
     * twice in a row.
     *
     * <p>{@code @Transactional} (read-write, unlike the read-only default we use for queries) so the
     * insert is committed as one unit.
     *
     * @throws ConflictException if the email is taken. We check first for a friendly message, but the
     *                          {@code UNIQUE} constraint on the column is the real guarantee: two
     *                          simultaneous registrations could both pass this check, and only the
     *                          database can break that tie.
     */
    @Transactional
    public AuthResult register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("That email is already registered");
        }

        User user = new User();
        user.setEmail(email);
        // The one and only place a raw password is touched. encode() runs BCrypt, which generates a
        // random salt per user and embeds it in the output -- so two people with the same password
        // still get different hashes, and precomputed rainbow tables are useless.
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.CUSTOMER); // Never let a client choose its own role. Admins are promoted in SQL.

        User saved = userRepository.save(user);
        log.info("Registered new account id={}", saved.getId());

        return issueTokensFor(saved);
    }

    /**
     * Verifies credentials and issues tokens.
     *
     * <p>{@code passwordEncoder.matches} re-hashes the supplied password using the salt embedded in
     * the stored hash and compares the results in constant time. We never decrypt anything — BCrypt
     * is one-way, which is why a password reset can only ever set a <em>new</em> password rather than
     * tell you your old one.
     *
     * @throws UnauthorizedException with an identical message whether the email is unknown or the
     *                              password is wrong. Distinguishing them would turn this endpoint
     *                              into a free "does this person have an account here?" oracle.
     */
    @Transactional(readOnly = true)
    public AuthResult login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.debug("Failed login attempt for id={}", user.getId());
            throw new UnauthorizedException("Invalid email or password");
        }

        return issueTokensFor(user);
    }

    /**
     * Trades a valid refresh token for a new access token — the mechanism that lets access tokens
     * expire in 15 minutes without the user noticing.
     *
     * <p>We re-read the user from the database rather than trusting the role inside the refresh
     * token. That closes a real hole: a user demoted from ADMIN to CUSTOMER would otherwise keep
     * minting admin access tokens from their old refresh token for up to 30 days. The same lookup
     * also locks out deleted accounts.
     *
     * @param refreshToken value of the HttpOnly cookie, or {@code null} if the browser sent none.
     */
    @Transactional(readOnly = true)
    public AuthResult refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new UnauthorizedException("Not signed in");
        }

        // Note the expected type: an ACCESS token presented here is rejected.
        AuthenticatedUser principal = jwtService.parse(refreshToken, TokenType.REFRESH);

        User user = userRepository.findById(principal.id())
                .orElseThrow(() -> new UnauthorizedException("Account no longer exists"));

        return issueTokensFor(user);
    }

    /**
     * The current user, re-read from the database — what {@code GET /api/auth/me} returns.
     *
     * <p>Why query at all, when the token already carries id, email and role? Because the token is a
     * snapshot from up to 15 minutes ago. This endpoint is what the UI trusts to render the account
     * menu, so it should reflect the account as it is now.
     */
    @Transactional(readOnly = true)
    public UserResponse currentUser(AuthenticatedUser principal) {
        return userRepository.findById(principal.id())
                .map(UserResponse::from)
                .orElseThrow(() -> new UnauthorizedException("Account no longer exists"));
    }

    /** Both tokens plus the public user view, in one place so login and register cannot drift apart. */
    private AuthResult issueTokensFor(User user) {
        return new AuthResult(
                jwtService.issueAccessToken(user),
                jwtService.issueRefreshToken(user),
                UserResponse.from(user));
    }

    /**
     * Emails are case-insensitive in practice, so we store and compare them lowercased. Without this,
     * {@code Sam@x.com} and {@code sam@x.com} become two accounts, and the second person to register
     * gets a confusing "already taken" — or worse, does not, and now support has two records to
     * reconcile.
     *
     * <p>{@code Locale.ROOT} rather than the default locale avoids the Turkish-I problem, where
     * lowercasing {@code "I"} under a Turkish locale yields {@code "ı"} and the same input hashes to
     * a different string depending on the server's regional settings.
     */
    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
