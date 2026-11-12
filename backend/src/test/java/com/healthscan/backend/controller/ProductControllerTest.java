package com.healthscan.backend.controller;

import com.healthscan.backend.dto.ImageAnalysisResponse;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.service.ImageAnalysisService;
import com.healthscan.backend.service.ProductService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@TestPropertySource(properties = {
        "healthscan.max-image-size=1KB",
        // High limits, so these tests never hit the rate limiter
        "healthscan.rate-limit.strict-per-minute=1000",
        "healthscan.rate-limit.relaxed-per-minute=1000"})
@SuppressWarnings("null") // Spring constants such as MediaType.APPLICATION_JSON are not annotated
class ProductControllerTest {

    private static final String BARCODE = "5201234567890";
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

    private static ProductResponse yogurt() {
        return new ProductResponse(BARCODE, "Yogurt", "", "", 72, "Fine");
    }

    @Test
    void languageDefaultsToGreek() throws Exception {
        when(productService.analyzeProduct(BARCODE, "el")).thenReturn(yogurt());

        mvc.perform(get("/api/v1/product/" + BARCODE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.healthScore").value(72));
    }

    @Test
    void unknownBarcodeIsAnOkResponseWithFoundFalse() throws Exception {
        ProductResponse unknown = new ProductResponse(BARCODE, "", "", "", null, "");
        unknown.setFound(false);
        when(productService.analyzeProduct(BARCODE, "en")).thenReturn(unknown);

        mvc.perform(get("/api/v1/product/" + BARCODE).param("lang", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.found").value(false));
    }

    @ParameterizedTest
    @ValueSource(strings = {"1234567", "123456789012345", "ABC12345", "12345678x"})
    void invalidBarcodeIsABadRequest(String barcode) throws Exception {
        mvc.perform(get("/api/v1/product/" + barcode))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("barcode must be 8 to 14 digits"));

        verifyNoInteractions(productService);
    }

    @Test
    void invalidBarcodeIsRejectedOnWebSearch() throws Exception {
        mvc.perform(post("/api/v1/product/ABC12345/web-search"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(productService);
    }

    @Test
    void invalidBarcodeIsRejectedOnLabel() throws Exception {
        mvc.perform(post("/api/v1/product/ABC12345/label")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson(IMAGE_BASE64)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(productService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"fr", "EN", "el;drop", "el,en"})
    void unsupportedLanguageIsABadRequest(String lang) throws Exception {
        mvc.perform(get("/api/v1/product/" + BARCODE).param("lang", lang))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(productService);
    }

    @Test
    void unsupportedLanguageIsRejectedOnWebSearch() throws Exception {
        mvc.perform(post("/api/v1/product/" + BARCODE + "/web-search").param("lang", "de"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("lang must be el or en"));
    }

    @Test
    void blankLabelImageIsABadRequest() throws Exception {
        mvc.perform(post("/api/v1/product/" + BARCODE + "/label")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson("")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void labelThatIsNotBase64IsABadRequestNotAServerError() throws Exception {
        mvc.perform(post("/api/v1/product/" + BARCODE + "/label")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson("@@not base64@@")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Image is not valid base64"));

        verifyNoInteractions(productService);
    }

    @Test
    void labelDataUrlPrefixIsStripped() throws Exception {
        when(productService.analyzeLabel(eq(BARCODE), eq(IMAGE), eq("en"))).thenReturn(yogurt());

        mvc.perform(post("/api/v1/product/" + BARCODE + "/label").param("lang", "en")
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
    void fruitBase64WithLineBreaksIsAccepted() throws Exception {
        when(imageAnalysisService.analyzeImage(eq(IMAGE), any()))
                .thenReturn(new ImageAnalysisResponse(true, "kiwi", "good", 90, "Fresh"));

        // JSON "\n" inside the base64, as some Android encoders produce
        mvc.perform(post("/api/v1/analyze-image-base64")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson("AQ\\nID")))
                .andExpect(status().isOk());
    }

    @Test
    void missingFruitImageIsABadRequest() throws Exception {
        mvc.perform(post("/api/v1/analyze-image-base64")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson("")))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(imageAnalysisService);
    }

    @Test
    void fruitThatIsNotBase64IsABadRequest() throws Exception {
        mvc.perform(post("/api/v1/analyze-image-base64")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson("%%%")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void oversizedLabelBodyIsRejectedWith413() throws Exception {
        mvc.perform(post("/api/v1/product/" + BARCODE + "/label")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson("A".repeat(2048))))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.status").value(413));

        verifyNoInteractions(productService);
    }

    @Test
    void oversizedFruitBodyIsRejectedWith413() throws Exception {
        mvc.perform(post("/api/v1/analyze-image-base64")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson("A".repeat(2048))))
                .andExpect(status().isPayloadTooLarge());

        verifyNoInteractions(imageAnalysisService);
    }

    @Test
    void multipartUploadIsAnalyzed() throws Exception {
        when(imageAnalysisService.analyzeImage(eq(IMAGE), any()))
                .thenReturn(new ImageAnalysisResponse(true, "kiwi", "good", 90, "Fresh"));

        mvc.perform(multipart("/api/v1/analyze-image").file(new MockMultipartFile("file", "kiwi.jpg", "image/jpeg", IMAGE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fruitName").value("kiwi"));
    }

    @Test
    void emptyMultipartFileIsABadRequest() throws Exception {
        mvc.perform(multipart("/api/v1/analyze-image").file(new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0])))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("No image provided"));

        verifyNoInteractions(imageAnalysisService);
    }

    @Test
    void missingMultipartFileIsABadRequest() throws Exception {
        mvc.perform(multipart("/api/v1/analyze-image"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void oversizedMultipartFileIsRejectedWith413() throws Exception {
        mvc.perform(multipart("/api/v1/analyze-image").file(new MockMultipartFile("file", "big.jpg", "image/jpeg", new byte[2048])))
                .andExpect(status().isPayloadTooLarge());

        verifyNoInteractions(imageAnalysisService);
    }

    @Test
    void aiOutageOnAFruitCheckIsABadGateway() throws Exception {
        when(imageAnalysisService.analyzeImage(any(), any()))
                .thenThrow(new com.healthscan.backend.web.AiUnavailableException("The AI service is not available right now", null));

        mvc.perform(post("/api/v1/analyze-image-base64")
                        .contentType(MediaType.APPLICATION_JSON).content(imageJson(IMAGE_BASE64)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value(502))
                .andExpect(jsonPath("$.detail").value("The AI service is not available right now"));
    }

    @Test
    void webSearchPassesTheLanguageThrough() throws Exception {
        when(productService.searchWeb(BARCODE, "en")).thenReturn(yogurt());

        mvc.perform(post("/api/v1/product/" + BARCODE + "/web-search").param("lang", "en"))
                .andExpect(status().isOk());

        verify(productService).searchWeb(BARCODE, "en");
    }

    @Test
    void noApiKeyIsNeededWhenNoneIsConfigured() throws Exception {
        when(productService.analyzeProduct(BARCODE, "el")).thenReturn(yogurt());

        mvc.perform(get("/api/v1/product/" + BARCODE)).andExpect(status().isOk());
    }

    @Test
    void frameworkErrorsAreProblemResponsesToo() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/product/" + BARCODE))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405))
                .andExpect(jsonPath("$.title").value("Method Not Allowed"));
    }
}
