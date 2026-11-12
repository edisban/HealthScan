package com.healthscan.backend.service;

import com.healthscan.backend.config.AiClientConfig;
import com.healthscan.backend.dto.ImageAnalysisResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import com.healthscan.backend.web.AiUnavailableException;
import com.healthscan.backend.web.InvalidImageException;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class ImageAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(ImageAnalysisService.class);

    private final WebClient webClient;

    /** @param aiWebClient the client from {@code AiClientConfig}: AI service base URL plus its shared secret */
    public ImageAnalysisService(WebClient aiWebClient) {
        this.webClient = aiWebClient;
    }

    /**
     * Sends the photo to the AI service for fruit detection and quality.
     *
     * @throws InvalidImageException if there is no image
     * @throws AiUnavailableException if the AI service is down, times out or answers with an error
     */
    public ImageAnalysisResponse analyzeImage(byte[] imageBytes, String filename) {
        if (imageBytes == null || imageBytes.length == 0) {
            throw new InvalidImageException("No image provided");
        }
        final String safeFilename = (filename == null || filename.isBlank()) ? "photo.jpg" : filename;
        ByteArrayResource resource = new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return safeFilename;
            }
        };
        ImageAnalysisResponse res;
        try {
            res = webClient.post()
                    .uri("/analyze-image")
                    // fromMultipartData sets the multipart Content-Type (with boundary) itself
                    .body(BodyInserters.fromMultipartData(buildMultipart(resource)))
                    .retrieve()
                    .bodyToMono(ImageAnalysisResponse.class)
                    .block(AiClientConfig.TIMEOUT);
        } catch (RuntimeException e) {
            // Down, timed out, or an error status: a failure, not a "no fruit" result
            log.warn("Fruit analysis failed: {}", e.toString());
            throw new AiUnavailableException("The AI service is not available right now", e);
        }
        if (res == null) {
            throw new AiUnavailableException("The AI service returned no answer", null);
        }
        return res;
    }

    @NonNull
    private MultiValueMap<String, Object> buildMultipart(ByteArrayResource resource) {
        MultiValueMap<String, Object> map = new LinkedMultiValueMap<>();
        map.add("file", resource);
        return map;
    }
}