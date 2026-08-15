package com.techstore.product.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body for creating or updating a product from the admin panel.
 *
 * <p>Note what is absent: {@code id}, {@code createdAt}, {@code version} and {@code inStock}. A
 * write DTO deliberately mirrors only the fields a client is allowed to set. Reusing
 * {@link ProductResponse} for writes would let a caller attempt to set its own id or backdate
 * {@code createdAt}, and every one of those would need defending against.
 *
 * @param categoryId nullable — a product may legitimately be uncategorised
 * @param priceCents integer cents, so the client cannot send 19.99 and lose a hundredth
 */
public record ProductRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 200, message = "Name must be at most 200 characters")
        String name,

        @Size(max = 5000, message = "Description must be at most 5000 characters")
        String description,

        @NotNull(message = "Price is required")
        // Zero is allowed (a free accessory); negative is not, since a negative line total
        // would corrupt every revenue figure downstream.
        @Min(value = 0, message = "Price cannot be negative")
        @Max(value = 100_000_000, message = "Price is unrealistically high")
        Integer priceCents,

        @NotNull(message = "Stock is required")
        @Min(value = 0, message = "Stock cannot be negative")
        @Max(value = 1_000_000, message = "Stock is unrealistically high")
        Integer stock,

        @Size(max = 500, message = "Image URL must be at most 500 characters")
        String imageUrl,

        Long categoryId,

        Long brandId) {
}
