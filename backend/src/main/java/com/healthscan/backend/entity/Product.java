package com.healthscan.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String barcode;

    private String name;
    private String imageUrl;
    @Column(length = 4000)
    private String ingredientsText;
    private Integer healthScore;
    @Column(length = 2000)
    private String explanation;
    private String lang;
    private String origin;
    @Column(length = 2000)
    private String nutrition;
    // AI-generated lists, stored as JSON arrays
    @Column(columnDefinition = "text")
    private String ingredientsJson;
    @Column(columnDefinition = "text")
    private String prosJson;
    @Column(columnDefinition = "text")
    private String consJson;

    public Product() {}

    public String getLang() { return lang; }
    public void setLang(String lang) { this.lang = lang; }
    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }
    public String getNutrition() { return nutrition; }
    public void setNutrition(String nutrition) { this.nutrition = nutrition; }
    public String getIngredientsJson() { return ingredientsJson; }
    public void setIngredientsJson(String ingredientsJson) { this.ingredientsJson = ingredientsJson; }
    public String getProsJson() { return prosJson; }
    public void setProsJson(String prosJson) { this.prosJson = prosJson; }
    public String getConsJson() { return consJson; }
    public void setConsJson(String consJson) { this.consJson = consJson; }

    public Long getId() { return id; }
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
}
