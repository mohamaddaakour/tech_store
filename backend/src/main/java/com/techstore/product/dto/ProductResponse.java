package com.techstore.product.dto;

import com.techstore.catalog.Brand;
import com.techstore.catalog.Category;
import com.techstore.product.Product;
import java.time.Instant;

public record ProductResponse(
    Long id,
    String name,
    String description,
    Integer priceCents,
    Integer stock,
    String imageUrl,
    boolean inStock,

    // Flattened instead of nested objects, because the storefront only ever shows
    // the label and filters by the slug
    String categoryName,
    String categorySlug,
    String brandName,
    String brandSlug,
    Instant createdAt
) {

    // Convert from Product to ProductResponse
    public static ProductResponse from(Product product) {
        Category category = product.getCategory();
        Brand brand = product.getBrand();

        return new ProductResponse(product.getId(),
            product.getName(),
            product.getDescription(),
            product.getPriceCents(),
            product.getStock(),
            product.getImageUrl(),

            // Return true if stock is higher than 0
            product.getStock() > 0,

            // Null until an admin files the product under a category or a brand
            category == null ? null : category.getName(),
            category == null ? null : category.getSlug(),
            brand == null ? null : brand.getName(),
            brand == null ? null : brand.getSlug(),
            product.getCreatedAt());
    }
}
