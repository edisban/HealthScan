package com.healthscan.backend.entity;

import jakarta.persistence.*;
import java.util.List;

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

    public Product() {}

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
