package com.techstore.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Database access for accounts.
 *
 * <p>{@link #findByEmail} is a <em>derived query</em>: Spring Data reads the method name, sees
 * "find ... by email", and generates {@code SELECT * FROM users WHERE email = ?} at startup. No
 * SQL, no implementation. If you typo the property name (say {@code findByEmial}), the application
 * fails to start with a clear message rather than misbehaving at runtime.
 *
 * <p>It returns {@link Optional} rather than {@code User} so "no such account" is part of the type
 * and the compiler forces the caller to handle it. That is what makes the login check in
 * {@code AuthService} safe.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    /**
     * Cheaper than {@code findByEmail(...).isPresent()} when we only care whether the row exists:
     * this becomes a {@code SELECT count(*)} and never builds a {@code User} object.
     */
    boolean existsByEmail(String email);
}
