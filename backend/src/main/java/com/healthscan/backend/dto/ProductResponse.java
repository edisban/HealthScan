package com.healthscan.backend.dto;

public class ProductResponse {
    private String barcode;
    private String name;
    private String imageUrl;
    private String ingredientsText;
    private Integer healthScore;
    private String explanation;
    private String productName;
    private String origin;
    private java.util.List<String> ingredients;
    private String nutrition;
    private java.util.List<String> pros;
    private java.util.List<String> cons;

    public ProductResponse() {}
    public ProductResponse(String barcode, String name, String imageUrl, String ingredientsText, Integer healthScore, String explanation) {
        this(barcode, name, imageUrl, ingredientsText, healthScore, explanation, name, "", null, "", null, null);
    }
    public ProductResponse(String barcode, String name, String imageUrl, String ingredientsText, Integer healthScore, String explanation,
                           String productName, String origin, java.util.List<String> ingredients, String nutrition,
                           java.util.List<String> pros, java.util.List<String> cons) {
        this.barcode = barcode; this.name = name; this.imageUrl = imageUrl; this.ingredientsText = ingredientsText;
        this.healthScore = healthScore; this.explanation = explanation;
        this.productName = productName; this.origin = origin; this.ingredients = ingredients; this.nutrition = nutrition;
        this.pros = pros; this.cons = cons;
    }
    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getIngredientsText() { return ingredientsText; }
    public void setIngredientsText(String ingredientsText) { this.ingredientsText = ingredientsText; }
    public Integer getHealthScore() { return healthScore; }
    public void setHealthScore(Integer healthScore) { this.healthScore = healthScore; }
    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }
    public java.util.List<String> getIngredients() { return ingredients; }
    public void setIngredients(java.util.List<String> ingredients) { this.ingredients = ingredients; }
    public String getNutrition() { return nutrition; }
    public void setNutrition(String nutrition) { this.nutrition = nutrition; }
    public java.util.List<String> getPros() { return pros; }
    public void setPros(java.util.List<String> pros) { this.pros = pros; }
    public java.util.List<String> getCons() { return cons; }
    public void setCons(java.util.List<String> cons) { this.cons = cons; }
}
