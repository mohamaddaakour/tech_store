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

/**
 * Categories and brands: read for the storefront, full CRUD for the admin panel.
 *
 * <p>Both live in one service because they are the same operations over two near-identical tables.
 * Splitting them would duplicate the slug/uniqueness logic twice over for no gain.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    /** Needed only for the product counts shown beside each entry. */
    private final ProductRepository productRepository;

    // ---------------------------------------------------------------- categories

    public List<CategoryResponse> findAllCategories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                // One count query per category. Fine for a handful of categories; if this list
                // ever grows into the hundreds it should become a single GROUP BY.
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

        // Allow saving without renaming: only reject a clash with a DIFFERENT row. Without the
        // equalsIgnoreCase guard, re-saving a category unchanged would fail as a duplicate of itself.
        if (!category.getName().equalsIgnoreCase(name)
                && categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A category named \"" + name + "\" already exists");
        }

        category.setName(name);
        category.setSlug(Slugs.from(name));

        // No explicit save() needed — `category` is a managed entity inside this transaction, so
        // Hibernate flushes the change on commit. Calling save() would be harmless but redundant.
        return CategoryResponse.from(category, productRepository.countByCategoryId(id));
    }

    @Transactional
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new NotFoundException("Category " + id + " was not found");
        }

        // Products are NOT deleted: the FK is ON DELETE SET NULL, so they simply become
        // uncategorised. Deleting inventory as a side effect of tidying up categories would be
        // an unpleasant surprise.
        categoryRepository.deleteById(id);
    }

    // ------------------------------------------------------------------- brands

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
