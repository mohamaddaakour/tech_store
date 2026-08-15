package com.techstore.product;

import com.techstore.common.PageResponse;
import com.techstore.product.dto.ProductResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public catalogue browsing.
 *
 * <p>CORS is configured once for the whole application in {@code SecurityConfig} (driven by
 * {@code app.cors.allowed-origins}), which is why there is no {@code @CrossOrigin} here.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * {@code GET /api/products} — search, filter, sort and paginate the catalogue.
     *
     * <p>Every parameter is optional with a sensible default, so a bare {@code GET /api/products}
     * still returns the first page. {@code required = false} plus {@code defaultValue} is what makes
     * the endpoint usable both from the filter panel and from a plain curl.
     *
     * <p>Returns {@link PageResponse} rather than Spring's {@code Page}, so the JSON shape is our
     * contract and cannot change under the frontend on a Spring Data upgrade.
     */
    @GetMapping
    public PageResponse<ProductResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {

        return productService.search(search, category, brand, maxPrice, inStock, sort, page, size);
    }

    /**
     * {@code GET /api/products/meta} — facts the filter UI needs before it can render.
     *
     * <p>Currently just the price ceiling for the slider. A separate lightweight endpoint rather
     * than bolting it onto the paginated response, because it does not change per page and the
     * client only needs it once.
     */
    @GetMapping("/meta")
    public ProductMeta meta() {
        return new ProductMeta(productService.findMaxPriceCents());
    }

    public record ProductMeta(int maxPriceCents) {
    }

    @GetMapping("/{id}")
    public ProductResponse findProductById(@PathVariable Long id) {
        return productService.findById(id);
    }
}
