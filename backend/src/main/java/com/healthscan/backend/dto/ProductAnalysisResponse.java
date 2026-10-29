package com.healthscan.backend.dto;

public class ProductAnalysisResponse {
    private String barcode;
    private int healthScore;
    private String explanation;

    public ProductAnalysisResponse() {}

    public ProductAnalysisResponse(String barcode, int healthScore, String explanation) {
        this.barcode = barcode;
        this.healthScore = healthScore;
        this.explanation = explanation;
    }

    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
    public int getHealthScore() { return healthScore; }
    public void setHealthScore(int healthScore) { this.healthScore = healthScore; }
    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
}
