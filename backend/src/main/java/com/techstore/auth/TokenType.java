package com.techstore.auth;

// Stamped inside every token, so a refresh token cannot be replayed as an access token
public enum TokenType {
    ACCESS,
    REFRESH
}
