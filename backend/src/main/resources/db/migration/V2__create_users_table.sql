-- Phase 3: accounts.
--
-- Flyway runs every V*.sql file once, in version order, and records it in its
-- flyway_schema_history table. Two rules that matter:
--   1. Never edit a migration that has already run -- Flyway stores a checksum of each
--      file and refuses to start if one changed. To fix something, add V3.
--   2. Migrations are the only thing allowed to change the schema. Hibernate runs with
--      ddl-auto: validate, so it checks this schema but never modifies it.

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,

    -- UNIQUE gives us two things for one line of SQL: the "one account per email" rule
    -- enforced by the database itself (so it holds even if two requests race), and an
    -- index that makes the login lookup by email fast.
    email         VARCHAR(255) NOT NULL UNIQUE,

    -- Named *_hash, not *_password, as a standing reminder: this column holds a BCrypt
    -- hash, never the password itself. BCrypt output is 60 characters; 255 leaves room to
    -- migrate to a longer algorithm (e.g. Argon2) later without another migration.
    password_hash VARCHAR(255) NOT NULL,

    -- Stored as text rather than a Postgres ENUM type: adding a new role later is then a
    -- code change, not an ALTER TYPE migration. Matches @Enumerated(EnumType.STRING).
    role          VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',

    -- TIMESTAMPTZ (not TIMESTAMP) so the instant is unambiguous regardless of the server's
    -- timezone. Filled in by the database, so the application cannot forget to set it.
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
