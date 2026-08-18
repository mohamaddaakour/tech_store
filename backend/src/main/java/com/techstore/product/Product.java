package com.techstore.product;

import com.techstore.catalog.Brand;
import com.techstore.catalog.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false)
    private String description;

    // We used integer here because in binary the float is not accurate 100%
    // per example: 0.1 + 0.2 is not exactly 0.3
    @Column(nullable = false, name = "price_cents")
    private Integer priceCents;

    @Column(nullable = false)
    private Integer stock;

    // image_url is the name in the database
    @Column(nullable = false, name = "image_url")
    private String imageUrl;

    // Nullable: a product can exist before it is filed under a category or a brand.
    // LAZY, so listing products does not drag both tables along; the read paths that
    // need them ask for them with @EntityGraph.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id")
    private Brand brand;

    // Written by the database default, never by us
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
