package com.healthscan.backend.dto;

/**
 * Fruit check result, as the AI service sends it and the app reads it.
 *
 * @param quality        "good", "bad" or "uncertain"
 * @param detectedObject what the photo shows when it is not a fruit, e.g. "cell phone"
 */
public record ImageAnalysisResponse(boolean fruitDetected, String fruitName, String quality, double confidence,
                                    String summary, String detectedObject) {

    public ImageAnalysisResponse {
        detectedObject = detectedObject == null ? "" : detectedObject;
    }

    public ImageAnalysisResponse(boolean fruitDetected, String fruitName, String quality, double confidence, String summary) {
        this(fruitDetected, fruitName, quality, confidence, summary, "");
    }
}
