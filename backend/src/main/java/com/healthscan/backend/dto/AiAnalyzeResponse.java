package com.healthscan.backend.dto;

import java.util.List;

public class AiAnalyzeResponse {
    private String barcode;
    private int healthScore;
    private String summary;
    private List<String> pros;
    private List<String> cons;
    private String productName;
    private String origin;
    private List<String> ingredients;
    private String nutrition;

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }
    public List<String> getIngredients() { return ingredients; }
    public void setIngredients(List<String> ingredients) { this.ingredients = ingredients; }
    public String getNutrition() { return nutrition; }
    public void setNutrition(String nutrition) { this.nutrition = nutrition; }

    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
    public int getHealthScore() { return healthScore; }
    public void setHealthScore(int healthScore) { this.healthScore = healthScore; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public List<String> getPros() { return pros; }
    public void setPros(List<String> pros) { this.pros = pros; }
    public List<String> getCons() { return cons; }
    public void setCons(List<String> cons) { this.cons = cons; }
}
