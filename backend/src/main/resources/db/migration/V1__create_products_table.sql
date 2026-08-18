-- Create the products table
CREATE TABLE products (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
    price_cents   INTEGER NOT NULL,
    stock         INTEGER NOT NULL DEFAULT 0,
    image_url     VARCHAR(500)
);

-- Insert rows to the products table
INSERT INTO products (name, description, price_cents, stock, image_url) VALUES
    ('ROG Strix G16', '16" gaming laptop, RTX 4070, 32GB RAM', 149900, 12, 'https://placehold.co/600x400'),
    ('UltraSharp 27" 4K', 'Color-accurate monitor for creators', 62900, 30, 'https://placehold.co/600x400'),
    ('MX Master 3S', 'Wireless productivity mouse', 9900, 120, 'https://placehold.co/600x400'),
    ('ThinkPad X1 Carbon', '14" business ultrabook, 32GB RAM', 189900, 5, 'https://placehold.co/600x400');