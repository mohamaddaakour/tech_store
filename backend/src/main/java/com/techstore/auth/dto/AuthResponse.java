package com.techstore.auth.dto;

public record AuthResponse(String accessToken, long expiresInSeconds, UserResponse user) {
}
