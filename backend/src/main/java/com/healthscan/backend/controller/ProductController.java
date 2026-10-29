package com.healthscan.backend.controller;

import com.healthscan.backend.dto.ImageAnalysisResponse;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.service.ImageAnalysisService;
import com.healthscan.backend.service.ProductService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class ProductController {

    private final ProductService productService;
    private final ImageAnalysisService imageAnalysisService;

    public ProductController(ProductService productService, ImageAnalysisService imageAnalysisService) {
        this.productService = productService;
        this.imageAnalysisService = imageAnalysisService;
    }

    @GetMapping("/product/{barcode}")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable String barcode,
                                                     @RequestParam(defaultValue = "el") String lang) {
        ProductResponse response = productService.analyzeProduct(barcode, lang);
        return ResponseEntity.ok(response);
    }

    @PostMapping(path = "/analyze-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImageAnalysisResponse> analyzeImage(@RequestParam("file") MultipartFile file) {
        try {
            ImageAnalysisResponse res = imageAnalysisService.analyzeImage(file.getBytes(), file.getOriginalFilename());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            ImageAnalysisResponse fallback = new ImageAnalysisResponse(false, "", "uncertain", 0.0, "Upload failed: " + e.getMessage());
            return ResponseEntity.ok(fallback);
        }
    }
}
