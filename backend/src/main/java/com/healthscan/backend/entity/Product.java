package com.healthscan.backend.entity;

import jakarta.persistence.*;

/** What is known about a barcode, whatever the language. The analyses per language are in {@link ProductAnalysis}. */
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String barcode;

    @Column(columnDefinition = "text")
    private String name;
    @Column(columnDefinition = "text")
    private String imageUrl;
    @Column(columnDefinition = "text")
    private String ingredientsText;
    // Where the product data came from: a database name, "Label photo" or "Web search"
    private String source;
    // From Open Food Facts; the score is calculated from them when the grade is present
    private String nutriScore;
    private Integer novaGroup;
    private Integer additivesCount;

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
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getNutriScore() { return nutriScore; }
    public void setNutriScore(String nutriScore) { this.nutriScore = nutriScore; }
    public Integer getNovaGroup() { return novaGroup; }
    public void setNovaGroup(Integer novaGroup) { this.novaGroup = novaGroup; }
    public Integer getAdditivesCount() { return additivesCount; }
    public void setAdditivesCount(Integer additivesCount) { this.additivesCount = additivesCount; }
}
