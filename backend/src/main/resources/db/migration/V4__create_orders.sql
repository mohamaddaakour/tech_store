-- Create the orders, order_items and order_events tables

-- Gives the number in the customer reference, TS-2026-0007. A sequence and not
-- count(*) + 1: sequences live outside the transaction, so two checkouts at the
-- same moment can never read the same number.
CREATE SEQUENCE order_reference_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE orders (
    id             BIGSERIAL PRIMARY KEY,

    -- The reference shown to customers. Separate from the primary key, so sequential
    -- ids are not exposed and nobody can guess another customer's order.
    reference      VARCHAR(32) NOT NULL UNIQUE,

    -- No ON DELETE, so Postgres restricts it: deleting a user who has orders fails.
    -- Orders are financial records and must survive the account being closed.
    user_id        BIGINT NOT NULL REFERENCES users (id),

    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    -- Money as integer cents, same reason as products: 0.1 + 0.2 is not 0.3 in binary
    subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL,
    total_cents    INTEGER NOT NULL,

    -- The address is copied onto the order, not referenced from a profile: an order
    -- records where it was actually sent, even if the customer edits their address
    full_name      VARCHAR(200) NOT NULL,
    line1          VARCHAR(255) NOT NULL,
    city           VARCHAR(120) NOT NULL,
    postal_code    VARCHAR(32)  NOT NULL,
    country        VARCHAR(120) NOT NULL,

    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Optimistic locking counter for @Version, so two admins cannot overwrite each other
    version        BIGINT NOT NULL DEFAULT 0
);

-- "My orders", newest first
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);

-- The dashboard filters by status and charts orders over time
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

CREATE TABLE order_items (
    id               BIGSERIAL PRIMARY KEY,

    -- CASCADE is right here: a line means nothing without its order
    order_id         BIGINT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,

    -- SET NULL, so removing a product from the catalogue does not erase the history
    -- of it having been sold. The columns below keep the line readable.
    product_id       BIGINT REFERENCES products (id) ON DELETE SET NULL,

    -- Copied at purchase time. Duplicating product data is required here: a receipt
    -- must show the name and the price the customer actually paid.
    product_name     VARCHAR(200) NOT NULL,
    image_url        VARCHAR(500),
    unit_price_cents INTEGER NOT NULL,

    quantity         INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- Used by the "top selling products" figures
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- One row per status change. Storing only the current status on orders would lose
-- when each change happened, which the order timeline needs.
CREATE TABLE order_events (
    id         BIGSERIAL PRIMARY KEY,
    order_id   BIGINT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- The admin who made the change, or NULL when the system did it, like the
    -- first event created at checkout
    actor_id   BIGINT REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_order_events_order ON order_events (order_id, created_at);
