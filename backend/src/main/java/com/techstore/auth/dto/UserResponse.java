package com.techstore.auth.dto;

import com.techstore.auth.Role;
import com.techstore.auth.User;

public record UserResponse(Long id, String email, Role role) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getRole());
    }
}
