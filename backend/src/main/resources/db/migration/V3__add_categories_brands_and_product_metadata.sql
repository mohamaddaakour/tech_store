-- Create the categories and brands tables, and link the products to them

CREATE TABLE categories (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    -- URL safe form, e.g. "laptops", so a shared link reads /store?category=laptops
    -- instead of a numeric id
    slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE brands (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
);

ALTER TABLE products
    -- SET NULL and not CASCADE: deleting a category must not delete its products.
    -- They become uncategorised, which can be undone.
    ADD COLUMN category_id BIGINT REFERENCES categories (id) ON DELETE SET NULL,
    ADD COLUMN brand_id    BIGINT REFERENCES brands (id) ON DELETE SET NULL,

    -- Needed by the dashboard's newest products and growth figures
    ADD COLUMN created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Optimistic locking counter, so two admins editing one product cannot
    -- overwrite each other
    ADD COLUMN version     BIGINT NOT NULL DEFAULT 0;

-- Postgres does not index foreign keys by itself. Without these, filtering by
-- category is a full table scan.
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_brand ON products (brand_id);

-- Newest first is the default sort on both the storefront and the admin list
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

-- Fill in the four products seeded in V1. Looked up by slug and not by a hardcoded
-- id, because BIGSERIAL does not always start at 1.
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

-- More products, so the dashboard charts and the low stock alerts have
-- something real to show
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
