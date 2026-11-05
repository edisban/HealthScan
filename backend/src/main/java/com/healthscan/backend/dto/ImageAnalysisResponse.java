package com.healthscan.backend.dto;

public class ImageAnalysisResponse {
    private boolean fruitDetected;
    private String fruitName;
    private String quality;  // "good" | "bad" | "uncertain"
    private double confidence;
    private String summary;
    // What the photo shows when it is not a fruit, e.g. "cell phone"
    private String detectedObject = "";

    public ImageAnalysisResponse() {}

    public ImageAnalysisResponse(boolean fruitDetected, String fruitName, String quality, double confidence, String summary) {
        this.fruitDetected = fruitDetected;
        this.fruitName = fruitName;
        this.quality = quality;
        this.confidence = confidence;
        this.summary = summary;
    }

    public boolean isFruitDetected() { return fruitDetected; }
    public void setFruitDetected(boolean fruitDetected) { this.fruitDetected = fruitDetected; }
    public String getFruitName() { return fruitName; }
    public void setFruitName(String fruitName) { this.fruitName = fruitName; }
    public String getQuality() { return quality; }
    public void setQuality(String quality) { this.quality = quality; }
    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getDetectedObject() { return detectedObject; }
    public void setDetectedObject(String detectedObject) { this.detectedObject = detectedObject; }
}
