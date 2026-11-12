package com.healthscan.backend.entity;

import jakarta.persistence.*;

import java.time.Instant;

/** A product's score and AI explanation in one language; each product has at most one per language. */
@Entity
@Table(name = "product_analysis",
        uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "lang"}))
public class ProductAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 2)
    private String lang;
    private Integer healthScore;
    // "Nutri-Score" when calculated, "AI estimate" otherwise
    private String scoreSource;
    @Column(columnDefinition = "text")
    private String explanation;
    @Column(columnDefinition = "text")
    private String origin;
    @Column(columnDefinition = "text")
    private String nutrition;
    // AI-generated lists, stored as JSON arrays
    @Column(columnDefinition = "text")
    private String ingredientsJson;
    @Column(columnDefinition = "text")
    private String prosJson;
    @Column(columnDefinition = "text")
    private String consJson;
    private Instant analyzedAt;

    protected ProductAnalysis() {}

    public ProductAnalysis(Product product, String lang) {
        this.product = product;
        this.lang = lang;
    }

    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public String getLang() { return lang; }
    public Integer getHealthScore() { return healthScore; }
    public void setHealthScore(Integer healthScore) { this.healthScore = healthScore; }
    public String getScoreSource() { return scoreSource; }
    public void setScoreSource(String scoreSource) { this.scoreSource = scoreSource; }
    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
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
    public Instant getAnalyzedAt() { return analyzedAt; }
    public void setAnalyzedAt(Instant analyzedAt) { this.analyzedAt = analyzedAt; }
}
