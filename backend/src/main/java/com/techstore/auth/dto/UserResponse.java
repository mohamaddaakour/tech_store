package com.techstore.auth.dto;

import com.techstore.auth.Role;
import com.techstore.auth.User;

/**
 * The safe, public view of an account — what the frontend is allowed to know about you.
 *
 * <p>This is the clearest example of why DTOs exist. The {@link User} entity has a
 * {@code passwordHash} field. Return the entity from a controller and Jackson serializes every
 * getter it can find, so that hash goes straight to the browser and into anyone's devtools. It is
 * not "just a hash", either: an offline brute-force against a leaked BCrypt hash is far easier than
 * one against a live login endpoint that rate-limits.
 *
 * <p>Listing fields explicitly makes leaking impossible by construction: a new column on the entity
 * cannot appear in the API unless someone adds it here on purpose.
 */
public record UserResponse(Long id, String email, Role role) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getRole());
    }
}
