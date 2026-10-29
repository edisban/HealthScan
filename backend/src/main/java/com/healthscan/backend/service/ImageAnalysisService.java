package com.healthscan.backend.service;

import com.healthscan.backend.dto.ImageAnalysisResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.http.MediaType;
import org.springframework.util.MultiValueMap;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.core.io.ByteArrayResource;

@Service
public class ImageAnalysisService {

    private final WebClient webClient;

    public ImageAnalysisService(WebClient.Builder builder) {
        String aiUrl = System.getenv("AI_SERVICE_URL");
        if (aiUrl == null || aiUrl.isBlank()) {
            aiUrl = "http://localhost:8000";
        }
        this.webClient = builder.baseUrl(aiUrl).build();
    }

    public ImageAnalysisResponse analyzeImage(byte[] imageBytes, String filename) {
        try {
            ByteArrayResource resource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };
            ImageAnalysisResponse res = webClient.post()
                .uri("/analyze-image")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .syncBody(buildMultipart(resource))
                .retrieve()
                .bodyToMono(ImageAnalysisResponse.class)
                .block();
            return res != null ? res : new ImageAnalysisResponse(false, "", "uncertain", 0.0, "No response from AI service.");
        } catch (WebClientResponseException | WebClientRequestException e) {
            return new ImageAnalysisResponse(false, "", "uncertain", 0.0, "AI service error: " + String.valueOf(e.getMessage()));
        } catch (Exception e) {
            return new ImageAnalysisResponse(false, "", "uncertain", 0.0, "Unexpected error: " + String.valueOf(e.getMessage()));
        }
    }

    private MultiValueMap<String, Object> buildMultipart(ByteArrayResource resource) {
        MultiValueMap<String, Object> map = new LinkedMultiValueMap<>();
        map.add("file", resource);
        return map;
    }
}
