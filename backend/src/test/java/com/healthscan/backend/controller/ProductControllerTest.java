package com.healthscan.backend.controller;

import com.healthscan.backend.dto.ImageAnalysisResponse;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.service.ImageAnalysisService;
import com.healthscan.backend.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@SuppressWarnings("null") // Spring constants such as MediaType.APPLICATION_JSON are not annotated
class ProductControllerTest {

    private static final byte[] IMAGE = {1, 2, 3};
    private static final String IMAGE_BASE64 = Base64.getEncoder().encodeToString(IMAGE);

    @Autowired
    private MockMvc mvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private ImageAnalysisService imageAnalysisService;

    private static String imageJson(String value) {
        return "{\"image\":\"" + value + "\"}";
    }

    @Test
    void languageDefaultsToGreek() throws Exception {
        when(productService.analyzeProduct("123", "el"))
                .thenReturn(new ProductResponse("123", "Yogurt", "", "", 72, "Fine"));

        mvc.perform(get("/api/v1/product/123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.healthScore").value(72));
    }

    @Test
    void unknownBarcodeIsAnOkResponseWithFoundFalse() throws Exception {
        ProductResponse unknown = new ProductResponse("123", "", "", "", null, "");
        unknown.setFound(false);
        when(productService.analyzeProduct("123", "en")).thenReturn(unknown);

        mvc.perform(get("/api/v1/product/123").param("lang", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.found").value(false));
    }

    @Test
    void blankLabelImageIsABadRequest() throws Exception {
        mvc.perform(post("/api/v1/product/123/label")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson("")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void labelDataUrlPrefixIsStripped() throws Exception {
        when(productService.analyzeLabel(eq("123"), eq(IMAGE), eq("en")))
                .thenReturn(new ProductResponse("123", "Yogurt", "", "", 72, "Fine"));

        mvc.perform(post("/api/v1/product/123/label").param("lang", "en")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(imageJson("data:image/jpeg;base64," + IMAGE_BASE64)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Yogurt"));
    }

    @Test
    void fruitDataUrlPrefixIsStripped() throws Exception {
        when(imageAnalysisService.analyzeImage(eq(IMAGE), any()))
                .thenReturn(new ImageAnalysisResponse(true, "kiwi", "good", 90, "Fresh"));

        mvc.perform(post("/api/v1/analyze-image-base64")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(imageJson("data:image/jpeg;base64," + IMAGE_BASE64)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fruitName").value("kiwi"));
    }

    @Test
    void missingFruitImageIsReportedInTheBody() throws Exception {
        mvc.perform(post("/api/v1/analyze-image-base64")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson("")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fruitDetected").value(false));
    }

    @Test
    void webSearchPassesTheLanguageThrough() throws Exception {
        when(productService.searchWeb("123", "en"))
                .thenReturn(new ProductResponse("123", "Yogurt", "", "", 72, "Fine"));

        mvc.perform(post("/api/v1/product/123/web-search").param("lang", "en"))
                .andExpect(status().isOk());

        verify(productService).searchWeb("123", "en");
    }
}
