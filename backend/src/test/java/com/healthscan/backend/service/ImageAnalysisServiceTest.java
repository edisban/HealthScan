package com.healthscan.backend.service;

import com.healthscan.backend.dto.ImageAnalysisResponse;
import com.healthscan.backend.web.AiUnavailableException;
import com.healthscan.backend.web.InvalidImageException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SuppressWarnings("null") // Reactor's Mono.just is not annotated, but these stubs never return null
class ImageAnalysisServiceTest {

    private static final byte[] IMAGE = {1, 2, 3};

    private static ImageAnalysisService serviceReplying(String json) {
        return new ImageAnalysisService(WebClient.builder().exchangeFunction(request ->
                Mono.just(ClientResponse.create(HttpStatus.OK)
                        .header("Content-Type", "application/json").body(json).build())).build());
    }

    @Test
    void detectedObjectReachesTheApp() {
        ImageAnalysisService service = serviceReplying("""
                {"fruitDetected":false,"fruitName":"","quality":"uncertain","confidence":0.0,
                 "summary":"Not a fruit. Detected: cell phone","detectedObject":"cell phone"}""");

        ImageAnalysisResponse response = service.analyzeImage(IMAGE, "photo.jpg");

        assertThat(response.isFruitDetected()).isFalse();
        assertThat(response.getDetectedObject()).isEqualTo("cell phone");
    }

    @Test
    void aiServiceOutageIsAnErrorNotANoFruitResult() {
        ImageAnalysisService service = new ImageAnalysisService(WebClient.builder()
                .exchangeFunction(request -> Mono.error(new IllegalStateException("AI service down"))).build());

        assertThatThrownBy(() -> service.analyzeImage(IMAGE, "photo.jpg"))
                .isInstanceOf(AiUnavailableException.class);
    }

    @Test
    void aiServiceErrorStatusIsAnErrorToo() {
        ImageAnalysisService service = new ImageAnalysisService(WebClient.builder()
                .exchangeFunction(request -> Mono.just(ClientResponse.create(HttpStatus.SERVICE_UNAVAILABLE).build())).build());

        assertThatThrownBy(() -> service.analyzeImage(IMAGE, "photo.jpg"))
                .isInstanceOf(AiUnavailableException.class);
    }

    @Test
    void emptyImageIsInvalid() {
        assertThatThrownBy(() -> serviceReplying("{}").analyzeImage(new byte[0], "photo.jpg"))
                .isInstanceOf(InvalidImageException.class);
    }
}
