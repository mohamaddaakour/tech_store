-- Create the users table

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,

    -- UNIQUE gives one account per email, enforced by the database even if two
    -- requests race, and an index that makes the login lookup fast
    email         VARCHAR(255) NOT NULL UNIQUE,

    -- Named _hash as a reminder: this holds a BCrypt hash, never the password.
    -- BCrypt output is 60 characters, 255 leaves room for a longer algorithm later.
    password_hash VARCHAR(255) NOT NULL,

    -- Text and not a Postgres ENUM, so adding a role later is a code change
    -- and not an ALTER TYPE migration
    role          VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',

    -- TIMESTAMPTZ, so the instant is the same whatever timezone the server runs in
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
