package com.healthscan.backend.web;

import com.healthscan.backend.controller.ProductController;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.service.ImageAnalysisService;
import com.healthscan.backend.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@TestPropertySource(properties = {
        "healthscan.cors-allowed-origins=http://localhost:8081",
        "healthscan.api-key=test-key",
        "healthscan.rate-limit.strict-per-minute=1000",
        "healthscan.rate-limit.relaxed-per-minute=1000"})
class CorsTest {

    private static final String WEB_APP = "http://localhost:8081";
    private static final String PRODUCT = "/api/v1/product/5201234567890";

    @Autowired
    private MockMvc mvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private ImageAnalysisService imageAnalysisService;

    @Test
    void preflightFromTheWebAppPassesWithoutTheApiKey() throws Exception {
        mvc.perform(options(PRODUCT)
                        .header("Origin", WEB_APP)
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "x-api-key"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", WEB_APP));
    }

    @Test
    void preflightFromAnotherOriginIsRejected() throws Exception {
        mvc.perform(options(PRODUCT)
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @Test
    void realRequestsStillNeedTheApiKey() throws Exception {
        mvc.perform(get(PRODUCT).header("Origin", WEB_APP)).andExpect(status().isUnauthorized());
    }

    @Test
    void allowedRequestCarriesTheCorsHeaders() throws Exception {
        when(productService.analyzeProduct("5201234567890", "el"))
                .thenReturn(product("5201234567890", "Yogurt", 72));

        mvc.perform(get(PRODUCT).header("Origin", WEB_APP).header(ApiKeyFilter.HEADER, "test-key"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", WEB_APP))
                .andExpect(header().string("Access-Control-Expose-Headers", "Retry-After"));
    }
    private static ProductResponse product(String barcode, String name, Integer score) {
        return new ProductResponse(barcode, true, name, "", "Open Food Facts", score, "AI estimate", "", null,
                "Fine", "", "", List.of(), List.of(), List.of());
    }
}
