package com.healthscan.backend.dto;

import java.util.List;

public class AiAnalyzeRequest {
    private String barcode;
    private String name;
    private List<String> ingredients;
    private String lang = "el";

    public AiAnalyzeRequest() {}
    public AiAnalyzeRequest(String barcode, String name, List<String> ingredients) {
        this(barcode, name, ingredients, "el");
    }
    public AiAnalyzeRequest(String barcode, String name, List<String> ingredients, String lang) {
        this.barcode = barcode;
        this.name = name;
        this.ingredients = ingredients;
        this.lang = lang;
    }
    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public List<String> getIngredients() { return ingredients; }
    public void setIngredients(List<String> ingredients) { this.ingredients = ingredients; }
    public String getLang() { return lang; }
    public void setLang(String lang) { this.lang = lang; }
}
