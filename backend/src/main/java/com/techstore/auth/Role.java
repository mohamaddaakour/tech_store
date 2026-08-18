package com.techstore.auth;

public enum Role {
    CUSTOMER,
    ADMIN;

    // Spring Security expects the ROLE_ prefix: hasRole("ADMIN") looks for ROLE_ADMIN
    public String asAuthority() {
        return "ROLE_" + name();
    }
}
