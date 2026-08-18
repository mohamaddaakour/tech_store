package com.techstore.common;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;

public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors) {

    public static ApiError of(HttpStatus status, String message, String path) {
        // `status.value()` give us the status code number only
        // `status.getReasonPhrase()` give us the status phrase like "Not Found"
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path, null);
    }

    public static ApiError validation(String message, String path, Map<String, String> fieldErrors) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path, fieldErrors);
    }
}
