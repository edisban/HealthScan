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
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
public class ImageAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(ImageAnalysisService.class);

    private final WebClient webClient;

    /** @param aiWebClient the client from {@code AiClientConfig}: AI service base URL plus its shared secret */
    public ImageAnalysisService(WebClient aiWebClient) {
        this.webClient = aiWebClient;
    }

    public ImageAnalysisResponse analyzeImage(byte[] imageBytes, String filename) {
        if (imageBytes == null || imageBytes.length == 0) {
            return new ImageAnalysisResponse(false, "", "uncertain", 0.0, "No image data provided.");
        }
        try {
            final String safeFilename = (filename == null || filename.isBlank()) ? "photo.jpg" : filename;
            ByteArrayResource resource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return safeFilename;
                }
            };

            ImageAnalysisResponse res = webClient.post()
                    .uri("/analyze-image")
                    // fromMultipartData sets the multipart Content-Type (with boundary) itself
                    .body(BodyInserters.fromMultipartData(buildMultipart(resource)))
                    .retrieve()
                    .bodyToMono(ImageAnalysisResponse.class)
                    .block(AiClientConfig.TIMEOUT);

            return res != null
                    ? res
                    : new ImageAnalysisResponse(false, "", "uncertain", 0.0, "No response from AI service.");
        } catch (WebClientResponseException | WebClientRequestException e) {
            log.warn("Fruit analysis failed: {}", e.toString());
            return new ImageAnalysisResponse(false, "", "uncertain", 0.0, "AI service error: " + e.getMessage());
        } catch (Exception e) {
            log.warn("Fruit analysis failed unexpectedly: {}", e.toString());
            return new ImageAnalysisResponse(false, "", "uncertain", 0.0, "Unexpected error: " + e.getMessage());
        }
    }

    @NonNull
    private MultiValueMap<String, Object> buildMultipart(ByteArrayResource resource) {
        MultiValueMap<String, Object> map = new LinkedMultiValueMap<>();
        map.add("file", resource);
        return map;
    }
}