package com.techstore.auth;

/**
 * What a user is allowed to do — the "RBAC" (role-based access control) part of Phase 3.
 *
 * <p>Spring Security has a naming convention worth knowing: a <em>role</em> {@code ADMIN} is
 * represented internally as the <em>authority</em> string {@code ROLE_ADMIN}. Helper methods like
 * {@code hasRole("ADMIN")} add the prefix for you, while {@code hasAuthority(...)} does not. Getting
 * these mixed up is the most common cause of "my admin check silently denies everyone", so we do
 * the prefixing in exactly one place: {@link #asAuthority()}.
 */
public enum Role {

    /** A shopper: can browse, hold a cart, and place their own orders. The default on register. */
    CUSTOMER,

    /** Store staff: additionally manages the catalog (Phase 6) and order statuses (Phase 8). */
    ADMIN;

    /** The Spring Security authority name for this role, e.g. {@code ROLE_ADMIN}. */
    public String asAuthority() {
        return "ROLE_" + name();
    }
}
