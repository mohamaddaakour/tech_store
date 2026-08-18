package com.techstore.common;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter
// Create a custom exception for API exception
public class ApiException extends RuntimeException {
    
    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        // The RuntimeException has a constructor for error messages
        // so we inherit it
        super(message);

        this.status = status;
    }
}
