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

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final CatalogService catalogService;

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

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        catalogService.deleteCategory(id);
    }

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
