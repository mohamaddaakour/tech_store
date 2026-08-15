package com.techstore.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;

// This is the single JSON shape that every failed request returns
// `@JsonInclude(JsonInclude.Include.NON_NULL)` means when Jackson serializes an ApiError instance
// to JSON, skip any field whose value is null
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors) {

    public static ApiError of(HttpStatus status, String message, String path) {
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path, null);
    }

    public static ApiError validation(String message, String path, Map<String, String> fieldErrors) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path, fieldErrors);
    }
}
