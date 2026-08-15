package com.techstore.product;

import com.techstore.common.PageResponse;
import com.techstore.product.dto.ProductRequest;
import com.techstore.product.dto.ProductResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Product management (SUBJECT.md Phase 6: create / update / delete).
 *
 * <p>Protected by the single {@code /api/admin/**} → {@code hasRole("ADMIN")} rule in
 * {@code SecurityConfig}. A CUSTOMER token reaching any of these gets a 403 with our standard
 * {@code ApiError} body; no token at all gets a 401.
 */
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final ProductService productService;

    /**
     * The admin product table.
     *
     * <p>Deliberately reuses the same service search as the storefront, with one difference:
     * {@code inStock} defaults to false so sold-out products are <em>included</em>. An admin
     * managing inventory specifically needs to see the items with zero stock — they are the ones
     * needing action.
     */
    @GetMapping
    public PageResponse<ProductResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return productService.search(search, category, brand, null, false, sort, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody ProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        productService.delete(id);
    }
}
