package com.techstore.common;

import org.springframework.http.HttpStatus;

/**
 * 400 — the request was understood but cannot be fulfilled as asked.
 *
 * <p>Distinct from a Bean Validation failure (which {@code GlobalExceptionHandler} handles
 * separately with per-field messages). This is for rules that need a database lookup to check, such
 * as "only 2 of those left" or "that status transition is not allowed".
 */
public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
