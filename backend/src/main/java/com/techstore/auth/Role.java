package com.techstore.auth;

public enum Role {
    CUSTOMER,
    ADMIN;

    // name() is a built in method that returns the enum value
    // as a String
    public String asAuthority() {
        return "ROLE_" + name();
    }
}
