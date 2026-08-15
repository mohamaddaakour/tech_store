package com.techstore.product.dto;

import com.techstore.product.Product;
import java.time.Instant;

/**
 * What the API sends for one product.
 *
 * <p>Category and brand are flattened to name + slug rather than nested objects. The frontend
 * only ever displays the name and filters by the slug, so a nested {@code {"category": {"id": 3,
 * "name": "Laptops", "slug": "laptops"}}} would just add a level of indirection to every read.
 *
 * <p>They are nullable because the columns are: {@code ON DELETE SET NULL} means deleting a
 * category leaves its products uncategorised rather than destroying them.
 */
public record ProductResponse(
        Long id,
        String name,
        String description,
        Integer priceCents,
        Integer stock,
        String imageUrl,
        boolean inStock,
        String categoryName,
        String categorySlug,
        String brandName,
        String brandSlug,
        Instant createdAt) {

    /**
     * Maps an entity to its response shape.
     *
     * <p><strong>Must be called inside the transaction</strong> that loaded the product: reading
     * {@code getCategory()} touches a lazy association, and outside a session that throws
     * {@code LazyInitializationException}. All callers are service methods marked
     * {@code @Transactional}.
     */
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPriceCents(),
                product.getStock(),
                product.getImageUrl(),
                // Derived once here, so no client has to re-implement "in stock means stock > 0".
                product.getStock() != null && product.getStock() > 0,
                product.getCategory() == null ? null : product.getCategory().getName(),
                product.getCategory() == null ? null : product.getCategory().getSlug(),
                product.getBrand() == null ? null : product.getBrand().getName(),
                product.getBrand() == null ? null : product.getBrand().getSlug(),
                product.getCreatedAt());
    }
}
