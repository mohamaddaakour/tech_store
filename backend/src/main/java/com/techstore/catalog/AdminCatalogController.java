package com.techstore.catalog;

import com.techstore.catalog.dto.CatalogDtos.BrandRequest;
import com.techstore.catalog.dto.CatalogDtos.BrandResponse;
import com.techstore.catalog.dto.CatalogDtos.CategoryRequest;
import com.techstore.catalog.dto.CatalogDtos.CategoryResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;

/**
 * Category and brand management (SUBJECT.md Phase 6).
 *
 * <p>Every route here sits under {@code /api/admin/**}, which {@code SecurityConfig} restricts with
 * {@code hasRole("ADMIN")}. That single rule secures the whole admin surface, so no individual
 * method needs its own annotation and a new endpoint cannot be added un-guarded by accident.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final CatalogService catalogService;

    // ---------------------------------------------------------------- categories

    /** 201 Created, because a new resource now exists. */
    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse createCategory(@Valid @RequestBody CategoryRequest request) {
        return catalogService.createCategory(request);
    }

    @PutMapping("/categories/{id}")
    public CategoryResponse updateCategory(@PathVariable Long id,
                                           @Valid @RequestBody CategoryRequest request) {
        return catalogService.updateCategory(id, request);
    }

    /** 204 No Content: the deletion succeeded and there is nothing meaningful to return. */
    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        catalogService.deleteCategory(id);
    }

    // ------------------------------------------------------------------- brands

    @PostMapping("/brands")
    @ResponseStatus(HttpStatus.CREATED)
    public BrandResponse createBrand(@Valid @RequestBody BrandRequest request) {
        return catalogService.createBrand(request);
    }

    @PutMapping("/brands/{id}")
    public BrandResponse updateBrand(@PathVariable Long id, @Valid @RequestBody BrandRequest request) {
        return catalogService.updateBrand(id, request);
    }

    @DeleteMapping("/brands/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBrand(@PathVariable Long id) {
        catalogService.deleteBrand(id);
    }
}
