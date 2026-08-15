package com.techstore.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A registered account. Maps to the {@code users} table from {@code V2__create_users_table.sql}.
 *
 * <p><strong>This class never holds a plaintext password.</strong> The only password-shaped field is
 * {@link #passwordHash}, and it is written exactly once, by {@code AuthService}, from
 * {@code PasswordEncoder.encode(...)}. Keeping the raw password out of the entity means it can
 * never accidentally reach the database, a log line, or a JSON response.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /** A BCrypt hash — see the class note. Never logged, never returned by the API. */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    /**
     * {@code EnumType.STRING} stores the literal text {@code "CUSTOMER"} / {@code "ADMIN"}.
     *
     * <p>The alternative, {@code EnumType.ORDINAL}, stores the enum's position as a number — which
     * silently corrupts every existing row the moment someone reorders or inserts a value in
     * {@link Role}. Always use STRING for persisted enums.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.CUSTOMER;

    /**
     * Set by the database's {@code DEFAULT now()}, which is why it is not insertable or updatable
     * here: we let Postgres be the single source of truth for the clock, and Java is forbidden from
     * overwriting it.
     */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
