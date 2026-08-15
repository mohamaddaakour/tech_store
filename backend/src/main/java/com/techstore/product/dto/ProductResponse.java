package com.techstore.product.dto;

import com.techstore.product.Product;

public record ProductResponse(
        Long id,
        String name,
        String description,
        Integer priceCents,
        Integer stock,
        String imageUrl,
        boolean inStock) {

    // Convert a Product entity into a ProductResponse dto
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPriceCents(),
                product.getStock(),
                product.getImageUrl(),
                product.getStock() != null && product.getStock() > 0);
    }
}
