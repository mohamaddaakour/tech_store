package com.techstore.auth;

/**
 * Which of the two tokens we are dealing with.
 *
 * <p>Both are signed with the same key, so without this marker they would be interchangeable — and
 * that is a real vulnerability: a 30-day refresh token could be sent as an {@code Authorization}
 * header and would work as a 30-day access token, defeating the whole point of short-lived access
 * tokens. Every token therefore carries a {@code typ} claim, and every verification says which type
 * it expects.
 */
public enum TokenType {

    /**
     * Short-lived (minutes). Sent on every API call in the {@code Authorization: Bearer ...} header.
     * Held only in JavaScript memory on the frontend — never {@code localStorage}, which any XSS
     * payload can read.
     */
    ACCESS,

    /**
     * Long-lived (days). Lives in an HttpOnly cookie, so JavaScript cannot read it at all. Its only
     * job is to be exchanged at {@code POST /api/auth/refresh} for a fresh access token.
     */
    REFRESH
}
