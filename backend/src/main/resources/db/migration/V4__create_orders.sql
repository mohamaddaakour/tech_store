-- Phase 6 prerequisite: real orders in Postgres.
--
-- Orders previously lived in the browser's localStorage, which was fine for a demo but
-- makes an admin dashboard impossible: revenue, sales trends and order management all
-- need server-side data that every admin can see.

-- Generates the numeric part of the customer-facing reference (TS-2026-0007).
--
-- A sequence rather than "SELECT count(*) + 1": counting is not safe under concurrency. Two
-- simultaneous checkouts would both read the same count and try to insert the same reference,
-- and one would fail on the UNIQUE constraint. Sequences are atomic and deliberately live
-- outside transactions, so nextval() never hands the same number to two callers.
CREATE SEQUENCE order_reference_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE orders (
    id             BIGSERIAL PRIMARY KEY,

    -- The human-facing reference (e.g. TS-2026-0007) shown to customers and support.
    -- Kept separate from the primary key on purpose: exposing sequential database ids
    -- lets anyone count your total orders, and pin down another customer's order by
    -- guessing a nearby number.
    reference      VARCHAR(32) NOT NULL UNIQUE,

    -- ON DELETE RESTRICT (Postgres' default for REFERENCES): deleting a user with orders
    -- fails. That is deliberate — orders are financial records and must survive account
    -- closure. Anonymising the user is the correct approach, not cascading a delete.
    user_id        BIGINT NOT NULL REFERENCES users (id),

    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    -- All money as integer cents. Never a float: 0.1 + 0.2 != 0.3 in binary floating
    -- point, and those fractions compound into real accounting errors.
    subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL,
    total_cents    INTEGER NOT NULL,

    -- The delivery address is COPIED onto the order, not referenced from a user profile.
    -- An order must record where it was actually sent; if the customer later edits their
    -- address, last month's dispatched order must not silently rewrite itself.
    full_name      VARCHAR(200) NOT NULL,
    line1          VARCHAR(255) NOT NULL,
    city           VARCHAR(120) NOT NULL,
    postal_code    VARCHAR(32)  NOT NULL,
    country        VARCHAR(120) NOT NULL,

    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Optimistic-locking counter, so two admins changing one order's status cannot
    -- silently overwrite each other.
    version        BIGINT NOT NULL DEFAULT 0
);

-- "My orders", newest first — the single most common customer query.
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);
-- The admin dashboard filters by status and charts orders over time.
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

CREATE TABLE order_items (
    id               BIGSERIAL PRIMARY KEY,

    -- ON DELETE CASCADE here IS correct: an order line has no meaning without its order.
    order_id         BIGINT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,

    -- SET NULL, so deleting a product from the catalogue does not destroy the history of
    -- it having been sold. The snapshot columns below keep the line readable afterwards.
    product_id       BIGINT REFERENCES products (id) ON DELETE SET NULL,

    -- Snapshots taken at purchase time. This is the one place duplicating product data is
    -- not just acceptable but required: a receipt must show the name and price the
    -- customer actually paid, even after the product is renamed or repriced.
    product_name     VARCHAR(200) NOT NULL,
    image_url        VARCHAR(500),
    unit_price_cents INTEGER NOT NULL,

    quantity         INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
-- Powers the dashboard's "top selling products" aggregate.
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- Append-only status history, which is what the customer's animated order timeline and
-- the admin audit view both read. Storing only the current status on `orders` would lose
-- *when* each transition happened.
CREATE TABLE order_events (
    id         BIGSERIAL PRIMARY KEY,
    order_id   BIGINT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Who caused the transition: an admin's user id, or NULL when the system did it
    -- (checkout creating the order, or a future Stripe webhook confirming payment).
    actor_id   BIGINT REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_order_events_order ON order_events (order_id, created_at);
