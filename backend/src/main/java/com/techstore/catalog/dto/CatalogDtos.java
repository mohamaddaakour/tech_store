package com.techstore.catalog.dto;

import com.techstore.catalog.Brand;
import com.techstore.catalog.Category;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The category and brand DTOs, grouped in one file.
 *
 * <p>These four records are tiny and always change together, so keeping them in a single
 * container reads better than four near-empty files. Nested records inside a non-instantiable
 * holder is the idiomatic Java way to express that grouping.
 */
public final class CatalogDtos {

    private CatalogDtos() {
    }

    /** What the API returns for a category. {@code productCount} drives the admin table. */
    public record CategoryResponse(Long id, String name, String slug, long productCount) {

        public static CategoryResponse from(Category category, long productCount) {
            return new CategoryResponse(category.getId(), category.getName(), category.getSlug(),
                    productCount);
        }
    }

    public record BrandResponse(Long id, String name, String slug, long productCount) {

        public static BrandResponse from(Brand brand, long productCount) {
            return new BrandResponse(brand.getId(), brand.getName(), brand.getSlug(), productCount);
        }
    }

    /**
     * Body for creating or updating a category.
     *
     * <p>Only the name is accepted — the slug is derived server-side by {@code Slugs.from(name)}.
     * Letting a client supply its own slug invites two records that disagree ({@code name: "Laptops"},
     * {@code slug: "monitors"}), and makes the URL form something the API has to validate rather
     * than something it guarantees.
     */
    public record CategoryRequest(
            @NotBlank(message = "Name is required")
            @Size(max = 100, message = "Name must be at most 100 characters")
            String name) {
    }

    public record BrandRequest(
            @NotBlank(message = "Name is required")
            @Size(max = 100, message = "Name must be at most 100 characters")
            String name) {
    }
}
