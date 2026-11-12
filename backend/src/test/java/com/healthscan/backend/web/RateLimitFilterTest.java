package com.healthscan.backend.web;

import com.healthscan.backend.controller.ProductController;
import com.healthscan.backend.dto.ImageAnalysisResponse;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.service.ImageAnalysisService;
import com.healthscan.backend.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@TestPropertySource(properties = {
        "healthscan.rate-limit.strict-per-minute=2",
        "healthscan.rate-limit.relaxed-per-minute=3"})
@SuppressWarnings("null") // Spring constants such as MediaType.APPLICATION_JSON are not annotated
class RateLimitFilterTest {

    private static final String BARCODE = "5201234567890";
    private static final String IMAGE_JSON = "{\"image\":\"AQID\"}";

    @Autowired
    private MockMvc mvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private ImageAnalysisService imageAnalysisService;

    @BeforeEach
    void setUp() {
        ProductResponse product = new ProductResponse(BARCODE, "Yogurt", "", "", 72, "Fine");
        when(productService.analyzeProduct(anyString(), anyString())).thenReturn(product);
        when(productService.searchWeb(anyString(), anyString())).thenReturn(product);
        when(productService.analyzeLabel(anyString(), any(), anyString())).thenReturn(product);
        when(imageAnalysisService.analyzeImage(any(), any()))
                .thenReturn(new ImageAnalysisResponse(true, "kiwi", "good", 90, "Fresh"));
    }

    // Each test uses its own client IP, so buckets never carry over between tests
    private static MockHttpServletRequestBuilder from(String ip, MockHttpServletRequestBuilder request) {
        return request.with(r -> {
            r.setRemoteAddr(ip);
            return r;
        });
    }

    private static MockHttpServletRequestBuilder lookup(String ip) {
        return from(ip, get("/api/v1/product/" + BARCODE));
    }

    private static MockHttpServletRequestBuilder webSearch(String ip) {
        return from(ip, post("/api/v1/product/" + BARCODE + "/web-search"));
    }

    @Test
    void productLookupHasTheRelaxedLimit() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(lookup("10.0.0.1")).andExpect(status().isOk());
        }

        mvc.perform(lookup("10.0.0.1"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", org.hamcrest.Matchers.matchesPattern("[1-9]\\d*")))
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void webSearchHasTheStrictLimit() throws Exception {
        mvc.perform(webSearch("10.0.0.2")).andExpect(status().isOk());
        mvc.perform(webSearch("10.0.0.2")).andExpect(status().isOk());

        mvc.perform(webSearch("10.0.0.2"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    void allGroqEndpointsShareTheStrictLimit() throws Exception {
        mvc.perform(webSearch("10.0.0.3")).andExpect(status().isOk());
        mvc.perform(from("10.0.0.3", post("/api/v1/analyze-image-base64")
                .contentType(MediaType.APPLICATION_JSON).content(IMAGE_JSON))).andExpect(status().isOk());

        mvc.perform(from("10.0.0.3", post("/api/v1/product/" + BARCODE + "/label")
                        .contentType(MediaType.APPLICATION_JSON).content(IMAGE_JSON)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void usingUpTheStrictLimitLeavesLookupsAvailable() throws Exception {
        mvc.perform(webSearch("10.0.0.4"));
        mvc.perform(webSearch("10.0.0.4"));
        mvc.perform(webSearch("10.0.0.4")).andExpect(status().isTooManyRequests());

        mvc.perform(lookup("10.0.0.4")).andExpect(status().isOk());
    }

    @Test
    void eachIpHasItsOwnLimit() throws Exception {
        mvc.perform(webSearch("10.0.0.5"));
        mvc.perform(webSearch("10.0.0.5"));
        mvc.perform(webSearch("10.0.0.5")).andExpect(status().isTooManyRequests());

        mvc.perform(webSearch("10.0.0.6")).andExpect(status().isOk());
    }

    @Test
    void endpointsAreSortedIntoTheRightTier() {
        assertThat(RateLimitFilter.tierOf("POST", "/api/v1/product/123/web-search")).isEqualTo(RateLimitFilter.Tier.STRICT);
        assertThat(RateLimitFilter.tierOf("POST", "/api/v1/product/123/label")).isEqualTo(RateLimitFilter.Tier.STRICT);
        assertThat(RateLimitFilter.tierOf("POST", "/api/v1/analyze-image")).isEqualTo(RateLimitFilter.Tier.STRICT);
        assertThat(RateLimitFilter.tierOf("POST", "/api/v1/analyze-image-base64")).isEqualTo(RateLimitFilter.Tier.STRICT);
        assertThat(RateLimitFilter.tierOf("GET", "/api/v1/product/123")).isEqualTo(RateLimitFilter.Tier.RELAXED);
        assertThat(RateLimitFilter.tierOf("GET", "/actuator/health")).isNull();
    }
}
