package com.techstore.catalog;

import com.techstore.catalog.dto.CatalogDtos.BrandRequest;
import com.techstore.catalog.dto.CatalogDtos.BrandResponse;
import com.techstore.catalog.dto.CatalogDtos.CategoryRequest;
import com.techstore.catalog.dto.CatalogDtos.CategoryResponse;
import com.techstore.common.ConflictException;
import com.techstore.common.NotFoundException;
import com.techstore.common.Slugs;
import com.techstore.product.ProductRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;

    // The product count is what lets the storefront show "Laptops (12)"
    public List<CategoryResponse> findAllCategories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(category -> CategoryResponse.from(category,
                        productRepository.countByCategoryId(category.getId())))
                .toList();
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        String name = request.name().trim();

        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A category named \"" + name + "\" already exists");
        }

        Category category = new Category();
        category.setName(name);
        category.setSlug(Slugs.from(name));

        return CategoryResponse.from(categoryRepository.save(category), 0);
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Category " + id + " was not found"));

        String name = request.name().trim();

        if (!category.getName().equalsIgnoreCase(name)
                && categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A category named \"" + name + "\" already exists");
        }

        // The slug is regenerated on rename, so links keep matching the name
        category.setName(name);
        category.setSlug(Slugs.from(name));

        return CategoryResponse.from(category, productRepository.countByCategoryId(id));
    }

    // The products keep existing, the migration sets their category to NULL on delete
    @Transactional
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new NotFoundException("Category " + id + " was not found");
        }

        categoryRepository.deleteById(id);
    }

    public List<BrandResponse> findAllBrands() {
        return brandRepository.findAllByOrderByNameAsc().stream()
                .map(brand -> BrandResponse.from(brand, productRepository.countByBrandId(brand.getId())))
                .toList();
    }

    @Transactional
    public BrandResponse createBrand(BrandRequest request) {
        String name = request.name().trim();

        if (brandRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A brand named \"" + name + "\" already exists");
        }

        Brand brand = new Brand();
        brand.setName(name);
        brand.setSlug(Slugs.from(name));

        return BrandResponse.from(brandRepository.save(brand), 0);
    }

    @Transactional
    public BrandResponse updateBrand(Long id, BrandRequest request) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Brand " + id + " was not found"));

        String name = request.name().trim();

        if (!brand.getName().equalsIgnoreCase(name) && brandRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A brand named \"" + name + "\" already exists");
        }

        brand.setName(name);
        brand.setSlug(Slugs.from(name));

        return BrandResponse.from(brand, productRepository.countByBrandId(id));
    }

    @Transactional
    public void deleteBrand(Long id) {
        if (!brandRepository.existsById(id)) {
            throw new NotFoundException("Brand " + id + " was not found");
        }

        brandRepository.deleteById(id);
    }
}
