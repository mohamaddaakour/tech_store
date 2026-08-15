package com.techstore.auth;

public record AuthenticatedUser(Long id, String email, Role role) {
}
