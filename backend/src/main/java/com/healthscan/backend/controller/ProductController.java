package com.healthscan.backend.controller;

import com.healthscan.backend.config.HealthscanProperties;
import com.healthscan.backend.dto.ImageAnalysisBase64Request;
import com.healthscan.backend.dto.ImageAnalysisResponse;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.service.ImageAnalysisService;
import com.healthscan.backend.service.ProductService;
import com.healthscan.backend.web.Base64Image;
import com.healthscan.backend.web.ImageTooLargeException;
import com.healthscan.backend.web.InvalidImageException;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

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
                             HealthscanProperties properties) {
        this.productService = productService;
        this.imageAnalysisService = imageAnalysisService;
        this.maxImageBytes = properties.maxImageSize().toBytes();
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
        byte[] image = Base64Image.decode(req.image(), maxImageBytes);
        return ResponseEntity.ok(productService.analyzeLabel(barcode, image, lang));
    }

    /** Fallback for unknown barcodes: search the web for the product (slow, ~30 s). */
    @PostMapping("/product/{barcode}/web-search")
    public ResponseEntity<ProductResponse> searchWeb(
            @PathVariable @Pattern(regexp = BARCODE, message = BARCODE_MESSAGE) String barcode,
            @RequestParam(defaultValue = "el") @Pattern(regexp = LANG, message = LANG_MESSAGE) String lang) {
        return ResponseEntity.ok(productService.searchWeb(barcode, lang));
    }

    /** Same as the base64 endpoint, for clients that upload a file. Errors are 400, 413 or 502, never a 200. */
    @PostMapping(path = "/analyze-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImageAnalysisResponse> analyzeImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidImageException("No image provided");
        }
        if (file.getSize() > maxImageBytes) {
            throw new ImageTooLargeException("Image is larger than the upload limit");
        }
        byte[] image;
        try {
            image = file.getBytes();
        } catch (IOException e) {
            throw new InvalidImageException("The uploaded image could not be read");
        }
        return ResponseEntity.ok(imageAnalysisService.analyzeImage(image, file.getOriginalFilename()));
    }

    @PostMapping(path = "/analyze-image-base64", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ImageAnalysisResponse> analyzeImageBase64(@RequestBody ImageAnalysisBase64Request req) {
        byte[] image = Base64Image.decode(req.image(), maxImageBytes);
        return ResponseEntity.ok(imageAnalysisService.analyzeImage(image, "photo.jpg"));
    }
}
