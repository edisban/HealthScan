package com.healthscan.backend.web;

import com.healthscan.backend.controller.ProductController;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.service.ImageAnalysisService;
import com.healthscan.backend.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@TestPropertySource(properties = {
        "healthscan.api-key=test-key",
        "healthscan.rate-limit.strict-per-minute=1000",
        "healthscan.rate-limit.relaxed-per-minute=1000"})
@SuppressWarnings("null") // Spring constants such as MediaType.APPLICATION_JSON are not annotated
class ApiKeyFilterTest {

    private static final String BARCODE = "5201234567890";

    @Autowired
    private MockMvc mvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private ImageAnalysisService imageAnalysisService;

    @Test
    void missingKeyIsUnauthorized() throws Exception {
        mvc.perform(get("/api/v1/product/" + BARCODE))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        verifyNoInteractions(productService);
    }

    @Test
    void wrongKeyIsUnauthorized() throws Exception {
        mvc.perform(get("/api/v1/product/" + BARCODE).header(ApiKeyFilter.HEADER, "test-kez"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(productService);
    }

    @Test
    void correctKeyIsAccepted() throws Exception {
        when(productService.analyzeProduct(BARCODE, "el"))
                .thenReturn(product("5201234567890", "Yogurt", 72));

        mvc.perform(get("/api/v1/product/" + BARCODE).header(ApiKeyFilter.HEADER, "test-key"))
                .andExpect(status().isOk());
    }

    @Test
    void imageEndpointsNeedTheKeyToo() throws Exception {
        mvc.perform(post("/api/v1/analyze-image-base64")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"image\":\"AQID\"}"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(imageAnalysisService);
    }
    private static ProductResponse product(String barcode, String name, Integer score) {
        return new ProductResponse(barcode, true, name, "", "Open Food Facts", score, "AI estimate", "", null,
                "Fine", "", "", List.of(), List.of(), List.of());
    }
}
