package com.techstore.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/auth/register}.
 *
 * <p>The annotations are enforced by {@code @Valid} on the controller parameter. If any fail,
 * Spring throws before the method body runs, and {@code GlobalExceptionHandler} converts it into a
 * 400 listing each bad field. The service layer therefore never has to check for blank input.
 *
 * <p>Validating on the server matters even though the React form validates too: the frontend check
 * is a convenience for honest users, while anyone can {@code curl} this endpoint directly.
 *
 * @param email    used as the login identifier, so it must be unique — enforced by the
 *                 {@code UNIQUE} constraint on the column and checked up-front by the service.
 * @param password the plaintext password, which exists only for the microseconds it takes to hash.
 *                 The 8-character floor is a deliberate minimum; the 100-character ceiling is a
 *                 denial-of-service guard, because BCrypt is intentionally slow and hashing a
 *                 multi-megabyte "password" would tie up a request thread.
 */
public record RegisterRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        @Size(max = 255, message = "Email must be at most 255 characters")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        String password) {
}
