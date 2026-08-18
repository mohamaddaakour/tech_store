package com.techstore.product;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.techstore.common.PageResponse;
import com.techstore.product.dto.ProductResponse;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    
    private final ProductService productService;

    ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("all")
    public List<ProductResponse> findAll() {
        return productService.findAll();
    }

    @GetMapping("{id}")
    public ProductResponse findById(@PathVariable Long id) {
        return productService.findById(id);
    }

    @GetMapping("/maxprice")
    public int findMaxPriceCents() {
        return productService.findMaxPriceCents();
    }

    @GetMapping
    public PageResponse<ProductResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {

        return productService.search(search, maxPrice, inStock, sort, page, size);
    }
}
