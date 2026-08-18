package com.techstore.catalog;

import com.techstore.catalog.dto.CatalogDtos.BrandResponse;
import com.techstore.catalog.dto.CatalogDtos.CategoryResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
