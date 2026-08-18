package com.techstore.catalog.dto;

import com.techstore.catalog.Brand;
import com.techstore.catalog.Category;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class CatalogDtos {

    private CatalogDtos() {
    }

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
