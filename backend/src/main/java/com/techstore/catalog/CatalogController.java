package com.techstore.catalog;

import com.techstore.catalog.dto.CatalogDtos.BrandResponse;
import com.techstore.catalog.dto.CatalogDtos.CategoryResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, read-only facets for the storefront's filter panel.
 *
 * <p>These are {@code permitAll()} in {@code SecurityConfig} — browsing needs no account. Writing
 * to them is ADMIN-only and lives in {@code AdminCatalogController} under {@code /api/admin/**},
 * which keeps the two audiences on clearly separate URL prefixes rather than relying on the HTTP
 * method to imply permission.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping("/categories")
    public List<CategoryResponse> findAllCategories() {
        return catalogService.findAllCategories();
    }

    @GetMapping("/brands")
    public List<BrandResponse> findAllBrands() {
        return catalogService.findAllBrands();
    }
}
