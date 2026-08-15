-- Phase 6 prerequisite: real Category and Brand entities.
--
-- Until now the frontend GUESSED brand and category from product text (see the old
-- frontend/src/lib/catalog.ts). That was a stopgap and it could not know that a future
-- "Aurora R16" is a Dell. These tables make them real data.
--
-- Reminder: never edit V1 or V2. Flyway stores a checksum per file and refuses to start
-- if an applied migration changes. Corrections always arrive as a new version.

CREATE TABLE categories (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    -- URL-safe form, e.g. "laptops". Lets the storefront use /store?category=laptops
    -- instead of exposing numeric ids in shareable links.
    slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE brands (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
);

ALTER TABLE products
    -- ON DELETE SET NULL, not CASCADE: deleting a category must never delete the
    -- products in it. Those products become uncategorised, which is recoverable;
    -- silently destroying inventory is not.
    ADD COLUMN category_id BIGINT REFERENCES categories (id) ON DELETE SET NULL,
    ADD COLUMN brand_id    BIGINT REFERENCES brands (id) ON DELETE SET NULL,

    -- Needed by the dashboard's "newest products" and growth figures.
    ADD COLUMN created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Optimistic-locking counter for Hibernate's @Version. Two admins editing the same
    -- product concurrently: the second save fails loudly instead of silently discarding
    -- the first one's changes.
    ADD COLUMN version     BIGINT NOT NULL DEFAULT 0;

-- Foreign keys are NOT indexed automatically in Postgres. Without these, every
-- "products in this category" filter is a full table scan, and deleting a category has
-- to scan products to enforce the FK.
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_brand ON products (brand_id);

-- Sorting the catalogue newest-first is a default the storefront and admin list both use.
CREATE INDEX idx_products_created_at ON products (created_at DESC);

INSERT INTO categories (name, slug) VALUES
    ('Laptops', 'laptops'),
    ('Monitors', 'monitors'),
    ('Mice', 'mice'),
    ('Keyboards', 'keyboards'),
    ('Audio', 'audio'),
    ('Components', 'components');

INSERT INTO brands (name, slug) VALUES
    ('ASUS', 'asus'),
    ('Dell', 'dell'),
    ('Logitech', 'logitech'),
    ('Lenovo', 'lenovo'),
    ('Apple', 'apple'),
    ('Samsung', 'samsung'),
    ('Keychron', 'keychron'),
    ('Corsair', 'corsair');

-- Backfill the four products seeded in V1. Sub-selects on slug rather than hardcoded
-- ids, because BIGSERIAL values are not guaranteed to start at 1 on a re-run.
UPDATE products SET
    category_id = (SELECT id FROM categories WHERE slug = 'laptops'),
    brand_id    = (SELECT id FROM brands WHERE slug = 'asus')
WHERE name = 'ROG Strix G16';

UPDATE products SET
    category_id = (SELECT id FROM categories WHERE slug = 'monitors'),
    brand_id    = (SELECT id FROM brands WHERE slug = 'dell')
WHERE name = 'UltraSharp 27" 4K';

UPDATE products SET
    category_id = (SELECT id FROM categories WHERE slug = 'mice'),
    brand_id    = (SELECT id FROM brands WHERE slug = 'logitech')
WHERE name = 'MX Master 3S';

UPDATE products SET
    category_id = (SELECT id FROM categories WHERE slug = 'laptops'),
    brand_id    = (SELECT id FROM brands WHERE slug = 'lenovo')
WHERE name = 'ThinkPad X1 Carbon';

-- More stock so the dashboard's charts, category breakdown and low-stock alerts have
-- something real to show. Four products makes every graph a straight line.
INSERT INTO products (name, description, price_cents, stock, image_url, category_id, brand_id) VALUES
    ('MacBook Air 15"', '15" ultraportable, M3, 16GB RAM, 512GB SSD',
     134900, 18, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'laptops'), (SELECT id FROM brands WHERE slug = 'apple')),

    ('Odyssey G9 49"', '49" ultrawide gaming monitor, 240Hz, QHD',
     129900, 4, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'monitors'), (SELECT id FROM brands WHERE slug = 'samsung')),

    ('ZenBook Duo 14"', '14" dual-screen laptop, 32GB RAM, 1TB SSD',
     169900, 0, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'laptops'), (SELECT id FROM brands WHERE slug = 'asus')),

    ('K2 Pro Mechanical', 'Wireless mechanical keyboard, hot-swappable',
     10900, 64, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'keyboards'), (SELECT id FROM brands WHERE slug = 'keychron')),

    ('MX Keys Mini', 'Compact wireless keyboard, backlit',
     8900, 41, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'keyboards'), (SELECT id FROM brands WHERE slug = 'logitech')),

    ('Virtuoso Pro Headset', 'Open-back wired gaming headset, 50mm drivers',
     17900, 3, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'audio'), (SELECT id FROM brands WHERE slug = 'corsair')),

    ('AirPods Max', 'Over-ear headphones, active noise cancellation',
     54900, 22, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'audio'), (SELECT id FROM brands WHERE slug = 'apple')),

    ('Studio Display 27"', '27" 5K Retina display, nano-texture glass',
     159900, 7, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'monitors'), (SELECT id FROM brands WHERE slug = 'apple')),

    ('ROG Gladius III', 'Wireless gaming mouse, 36K DPI sensor',
     11900, 2, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'mice'), (SELECT id FROM brands WHERE slug = 'asus')),

    ('RTX 4070 Ti Super', 'Graphics card, 16GB GDDR6X',
     84900, 9, 'https://placehold.co/600x400',
     (SELECT id FROM categories WHERE slug = 'components'), (SELECT id FROM brands WHERE slug = 'asus'));
