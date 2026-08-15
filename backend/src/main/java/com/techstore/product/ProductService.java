package com.techstore.product;

import com.techstore.catalog.Brand;
import com.techstore.catalog.BrandRepository;
import com.techstore.catalog.Category;
import com.techstore.catalog.CategoryRepository;
import com.techstore.common.NotFoundException;
import com.techstore.common.PageResponse;
import com.techstore.product.dto.ProductRequest;
import com.techstore.product.dto.ProductResponse;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Product reads for the storefront and full CRUD for the admin panel.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    /** Hard ceiling on page size, so nobody can request 10,000 rows in one call. */
    private static final int MAX_PAGE_SIZE = 60;

    /** A product at or below this stock level is "low stock" on the dashboard. */
    public static final int LOW_STOCK_THRESHOLD = 5;

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;

    /**
     * The storefront's paginated, filtered, sorted search (SUBJECT.md Phase 2).
     *
     * <p>This replaces the old unbounded {@code findAll()}. Filtering moved from the browser to
     * SQL, which matters as the catalogue grows: previously the frontend downloaded every product
     * and narrowed the list in JavaScript.
     *
     * @param sort one of {@code newest}, {@code price-asc}, {@code price-desc}, {@code name-asc},
     *             {@code stock-desc}; anything unrecognised falls back to newest
     */
    public PageResponse<ProductResponse> search(String search,
                                                String categorySlug,
                                                String brandSlug,
                                                Integer maxPriceCents,
                                                boolean inStockOnly,
                                                String sort,
                                                int page,
                                                int size) {

        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                sortFor(sort));

        Page<Product> results = productRepository.search(
                // The LIKE pattern is built here rather than in the query so the repository stays a
                // plain data accessor. Lowercased to match the LOWER(...) on the column, which is
                // what makes the search case-insensitive.
                blankToNull(search) == null ? null : "%" + search.trim().toLowerCase(Locale.ROOT) + "%",
                blankToNull(categorySlug),
                blankToNull(brandSlug),
                maxPriceCents,
                inStockOnly,
                pageable);

        // Mapping happens inside this transaction, while the lazy category/brand are still
        // reachable. See ProductResponse.from.
        return PageResponse.of(results, ProductResponse::from);
    }

    public ProductResponse findById(Long id) {
        return productRepository.findWithRelationsById(id)
                .map(ProductResponse::from)
                // Never return null: a null would travel up the stack and fail somewhere
                // unrelated. A typed exception becomes a clean 404 in GlobalExceptionHandler.
                .orElseThrow(() -> new NotFoundException("Product " + id + " was not found"));
    }

    /** Highest price in the catalogue, for the storefront's price-slider ceiling. */
    public int findMaxPriceCents() {
        return productRepository.findMaxPriceCents();
    }

    // ------------------------------------------------------------------ admin CRUD

    @Transactional
    public ProductResponse create(ProductRequest request) {
        Product product = new Product();
        apply(request, product);

        Product saved = productRepository.save(product);
        log.info("Admin created product id={} name={}", saved.getId(), saved.getName());

        // Re-read through the fetch graph so the response carries category and brand names.
        // `saved` has the association objects attached already, but going through the same path as
        // every other read keeps the mapping consistent.
        return productRepository.findWithRelationsById(saved.getId())
                .map(ProductResponse::from)
                .orElseThrow(() -> new NotFoundException("Product " + saved.getId() + " was not found"));
    }

    /**
     * Updates a product.
     *
     * <p>Concurrency is handled by the {@code @Version} column on {@link Product}: if another admin
     * saved between our read and our write, Hibernate's UPDATE matches no rows and throws
     * {@code OptimisticLockingFailureException}, which surfaces as a 409 rather than silently
     * discarding their edit.
     */
    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product " + id + " was not found"));

        apply(request, product);
        log.info("Admin updated product id={}", id);

        // Managed entity — Hibernate flushes on commit, no save() required.
        return productRepository.findWithRelationsById(id)
                .map(ProductResponse::from)
                .orElseThrow(() -> new NotFoundException("Product " + id + " was not found"));
    }

    /**
     * Deletes a product.
     *
     * <p>Safe with respect to order history: {@code order_items.product_id} is
     * {@code ON DELETE SET NULL} and each line snapshots the name and price it was sold at, so past
     * receipts stay readable after the product is gone.
     */
    @Transactional
    public void delete(Long id) {
        if (!productRepository.existsById(id)) {
            throw new NotFoundException("Product " + id + " was not found");
        }

        productRepository.deleteById(id);
        log.info("Admin deleted product id={}", id);
    }

    /**
     * Copies request fields onto an entity, resolving the category and brand ids.
     *
     * <p>Shared by create and update so the two cannot drift — the classic bug being a new field
     * that gets wired into create and forgotten in update.
     */
    private void apply(ProductRequest request, Product product) {
        product.setName(request.name().trim());
        product.setDescription(request.description());
        product.setPriceCents(request.priceCents());
        product.setStock(request.stock());
        product.setImageUrl(blankToNull(request.imageUrl()));

        // A null id means "no category", which is valid. A non-null id that does not exist is a
        // client error and must 404 rather than being silently ignored.
        product.setCategory(resolveCategory(request.categoryId()));
        product.setBrand(resolveBrand(request.brandId()));
    }

    private Category resolveCategory(Long categoryId) {
        if (categoryId == null) return null;

        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("Category " + categoryId + " was not found"));
    }

    private Brand resolveBrand(Long brandId) {
        if (brandId == null) return null;

        return brandRepository.findById(brandId)
                .orElseThrow(() -> new NotFoundException("Brand " + brandId + " was not found"));
    }

    /**
     * Maps a sort key from the query string to a {@link Sort}.
     *
     * <p>An allowlist, deliberately. Passing a client string straight to {@code Sort.by(...)} lets
     * a caller sort by any column name — including ones that are not part of the public API — and
     * turns a typo into a 500.
     */
    private Sort sortFor(String sort) {
        return switch (sort == null ? "" : sort) {
            case "price-asc" -> Sort.by(Sort.Direction.ASC, "priceCents");
            case "price-desc" -> Sort.by(Sort.Direction.DESC, "priceCents");
            case "name-asc" -> Sort.by(Sort.Direction.ASC, "name");
            case "stock-desc" -> Sort.by(Sort.Direction.DESC, "stock");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }

    /** Treats empty and whitespace-only strings as absent, so `?brand=` is not a filter for "". */
    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
