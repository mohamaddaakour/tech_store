package com.techstore.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Body of {@code POST /api/auth/login}.
 *
 * <p>Note what is missing compared to {@link RegisterRequest}: no {@code @Email}, no {@code @Size}
 * on the password. That is intentional, for two reasons.
 * <ul>
 *   <li><strong>Do not advertise the password policy.</strong> Rejecting a 6-character attempt with
 *       "must be at least 8 characters" tells an attacker exactly which candidates to skip.</li>
 *   <li><strong>Old accounts must still be able to log in.</strong> If the rules are tightened later,
 *       validating them here would lock out every user whose existing password predates the
 *       change.</li>
 * </ul>
 * We only insist the fields are present; whether they are <em>correct</em> is settled by the hash
 * comparison, which answers with a single vague "Invalid email or password" either way.
 */
public record LoginRequest(

        @NotBlank(message = "Email is required")
        String email,

        @NotBlank(message = "Password is required")
        String password) {
}
