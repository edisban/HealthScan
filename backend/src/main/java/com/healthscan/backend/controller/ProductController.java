package com.healthscan.backend.controller;

import com.healthscan.backend.dto.ImageAnalysisBase64Request;
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

    /** Fallback for unknown barcodes: identify the product from a photo of its label (base64 JSON). */
    @PostMapping(path = "/product/{barcode}/label", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProductResponse> analyzeLabel(@PathVariable String barcode,
                                                        @RequestParam(defaultValue = "el") String lang,
                                                        @RequestBody ImageAnalysisBase64Request req) {
        String base64 = req.getImage();
        if (base64 == null || base64.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (base64.contains(",")) {
            base64 = base64.substring(base64.indexOf(",") + 1);
        }
        byte[] imageBytes = java.util.Base64.getMimeDecoder().decode(base64);
        return ResponseEntity.ok(productService.analyzeLabel(barcode, imageBytes, lang));
    }

    /** Fallback for unknown barcodes: search the web for the product (slow, ~30 s). */
    @PostMapping("/product/{barcode}/web-search")
    public ResponseEntity<ProductResponse> searchWeb(@PathVariable String barcode,
                                                     @RequestParam(defaultValue = "el") String lang) {
        return ResponseEntity.ok(productService.searchWeb(barcode, lang));
    }

    @PostMapping(path = "/analyze-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImageAnalysisResponse> analyzeImage(@RequestParam("file") MultipartFile file) {
        try {
            ImageAnalysisResponse res = imageAnalysisService.analyzeImage(file.getBytes(), file.getOriginalFilename());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            ImageAnalysisResponse fallback = new ImageAnalysisResponse(false, "", "uncertain", 0.0, "Upload failed: " + String.valueOf(e.getMessage()));
            return ResponseEntity.ok(fallback);
        }
    }

    @PostMapping(path = "/analyze-image-base64", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ImageAnalysisResponse> analyzeImageBase64(@RequestBody ImageAnalysisBase64Request req) {
        try {
            String base64 = req.getImage();
            if (base64 == null || base64.isBlank()) {
                ImageAnalysisResponse fallback = new ImageAnalysisResponse(false, "", "uncertain", 0.0, "No image provided");
                return ResponseEntity.ok(fallback);
            }
            // Remove data URL prefix if present (e.g. "data:image/jpeg;base64,")
            if (base64.contains(",")) {
                base64 = base64.substring(base64.indexOf(",") + 1);
            }
            byte[] imageBytes = java.util.Base64.getDecoder().decode(base64);
            ImageAnalysisResponse res = imageAnalysisService.analyzeImage(imageBytes, "photo.jpg");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            ImageAnalysisResponse fallback = new ImageAnalysisResponse(false, "", "uncertain", 0.0, "Upload failed: " + String.valueOf(e.getMessage()));
            return ResponseEntity.ok(fallback);
        }
    }
}
