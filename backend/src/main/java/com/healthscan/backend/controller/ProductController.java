package com.healthscan.backend.controller;

import com.healthscan.backend.dto.ImageAnalysisBase64Request;
import com.healthscan.backend.dto.ImageAnalysisResponse;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.service.ImageAnalysisService;
import com.healthscan.backend.service.ProductService;
import com.healthscan.backend.web.Base64Image;
import jakarta.validation.constraints.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@Validated
public class ProductController {

    private static final String BARCODE = "\\d{8,14}";
    private static final String BARCODE_MESSAGE = "barcode must be 8 to 14 digits";
    private static final String LANG = "el|en";
    private static final String LANG_MESSAGE = "lang must be el or en";

    private final ProductService productService;
    private final ImageAnalysisService imageAnalysisService;
    private final long maxImageBytes;

    public ProductController(ProductService productService, ImageAnalysisService imageAnalysisService,
                             @Value("${healthscan.max-image-size:8MB}") DataSize maxImageSize) {
        this.productService = productService;
        this.imageAnalysisService = imageAnalysisService;
        this.maxImageBytes = maxImageSize.toBytes();
    }

    @GetMapping("/product/{barcode}")
    public ResponseEntity<ProductResponse> getProduct(
            @PathVariable @Pattern(regexp = BARCODE, message = BARCODE_MESSAGE) String barcode,
            @RequestParam(defaultValue = "el") @Pattern(regexp = LANG, message = LANG_MESSAGE) String lang) {
        return ResponseEntity.ok(productService.analyzeProduct(barcode, lang));
    }

    /** Fallback for unknown barcodes: identify the product from a photo of its label (base64 JSON). */
    @PostMapping(path = "/product/{barcode}/label", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProductResponse> analyzeLabel(
            @PathVariable @Pattern(regexp = BARCODE, message = BARCODE_MESSAGE) String barcode,
            @RequestParam(defaultValue = "el") @Pattern(regexp = LANG, message = LANG_MESSAGE) String lang,
            @RequestBody ImageAnalysisBase64Request req) {
        byte[] image = Base64Image.decode(req.getImage(), maxImageBytes);
        return ResponseEntity.ok(productService.analyzeLabel(barcode, image, lang));
    }

    /** Fallback for unknown barcodes: search the web for the product (slow, ~30 s). */
    @PostMapping("/product/{barcode}/web-search")
    public ResponseEntity<ProductResponse> searchWeb(
            @PathVariable @Pattern(regexp = BARCODE, message = BARCODE_MESSAGE) String barcode,
            @RequestParam(defaultValue = "el") @Pattern(regexp = LANG, message = LANG_MESSAGE) String lang) {
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
        byte[] image = Base64Image.decode(req.getImage(), maxImageBytes);
        return ResponseEntity.ok(imageAnalysisService.analyzeImage(image, "photo.jpg"));
    }
}
