package com.healthscan.backend.controller;

import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/product/{barcode}")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable String barcode,
                                                     @RequestParam(defaultValue = "el") String lang) {
        ProductResponse response = productService.analyzeProduct(barcode, lang);
        return ResponseEntity.ok(response);
    }
}
