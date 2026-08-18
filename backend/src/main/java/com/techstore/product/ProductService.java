package com.techstore.product;

import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import com.techstore.common.NotFoundException;
import com.techstore.common.PageResponse;
import com.techstore.product.dto.ProductResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductService {

    // Inject product repository
    private final ProductRepository productRepository;

    // hard coding max page size
    private static final int MAX_PAGE_SIZE = 60;

    // At or below this stock the admin dashboard flags the product for restocking
    public static final int LOW_STOCK_THRESHOLD = 5;
    
    // find all products
    public List<ProductResponse> findAll() {
        return productRepository.findAllByOrderByIdAsc()
            .stream()
            .map(ProductResponse::from)
            .toList();
    }

    // Find a product by its id
    public ProductResponse findById(Long id) {
        return productRepository.findById(id)
            .map(ProductResponse::from)
            .orElseThrow(() -> new NotFoundException("Product with " + id + " not found"));
    }

    // find maximum price in the products table
    public int findMaxPriceCents() {
        return productRepository.findMaxPriceCents();
    }

    public PageResponse<ProductResponse> search(String search,
                                                Integer maxPriceCents,
                                                boolean inStockOnly,
                                                String sort,
                                                int page,
                                                int size) {

        Pageable pageable = PageRequest.of(
                // Page number
                Math.max(0, page),

                // Page size
                Math.clamp(size, 1, MAX_PAGE_SIZE),

                // How to sort the elements
                sortFor(sort));

        Page<Product> results = productRepository.search(
                blankToNull(search) == null ? null : "%" + search.trim().toLowerCase(Locale.ROOT) + "%",
                maxPriceCents,
                inStockOnly,
                pageable);

        return PageResponse.of(results, ProductResponse::from);
    }

    // If a string is absent or empty return null else trim the
    // string
    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    // Sort elements with the right property
    private Sort sortFor(String sort) {
        return switch (sort) {
            case "price_asc" -> Sort.by("priceCents").ascending();
            case "price_desc" -> Sort.by("priceCents").descending();
            case "name_asc" -> Sort.by("name").ascending();
            case "name_desc" -> Sort.by("name").descending();
            default -> Sort.by("id").descending();
        };
    }
}
