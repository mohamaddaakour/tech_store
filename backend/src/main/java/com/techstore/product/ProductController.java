package com.techstore.product;

import com.techstore.product.dto.ProductResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public List<ProductResponse> findAllProducts() {
        return productService.findAll();
    }

    @GetMapping("/{id}")
    public ProductResponse findProductById(@PathVariable Long id) {
        return productService.findById(id);
    }
}
