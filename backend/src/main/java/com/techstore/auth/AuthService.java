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

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public record AuthResult(String accessToken, String refreshToken, UserResponse user) {
    }

    @Transactional
    public AuthResult register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("That email is already registered");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.CUSTOMER);

        User saved = userRepository.save(user);
        log.info("Registered new account id={}", saved.getId());

        return issueTokensFor(saved);
    }

    @Transactional(readOnly = true)
    public AuthResult login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        // The same message for an unknown email and for a wrong password, so the response
        // cannot be used to find out which emails are registered
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.debug("Failed login attempt for id={}", user.getId());
            throw new UnauthorizedException("Invalid email or password");
        }

        return issueTokensFor(user);
    }

    @Transactional(readOnly = true)
    public AuthResult refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new UnauthorizedException("Not signed in");
        }

        AuthenticatedUser principal = jwtService.parse(refreshToken, TokenType.REFRESH);

        User user = userRepository.findById(principal.id())
                .orElseThrow(() -> new UnauthorizedException("Account no longer exists"));

        return issueTokensFor(user);
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(AuthenticatedUser principal) {
        return userRepository.findById(principal.id())
                .map(UserResponse::from)
                .orElseThrow(() -> new UnauthorizedException("Account no longer exists"));
    }

    private AuthResult issueTokensFor(User user) {
        return new AuthResult(
                jwtService.issueAccessToken(user),
                jwtService.issueRefreshToken(user),
                UserResponse.from(user));
    }

    // Emails are stored lower case, otherwise Ali@x.com and ali@x.com become two accounts
    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
