package com.healthscan.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** A barcode the web search could not identify, kept so repeat scans don't spend Groq quota on it. */
@Entity
@Table(name = "web_search_misses")
public class WebSearchMiss {
    @Id
    private String barcode;

    private Instant searchedAt;

    protected WebSearchMiss() {}

    public WebSearchMiss(String barcode, Instant searchedAt) {
        this.barcode = barcode;
        this.searchedAt = searchedAt;
    }

    public String getBarcode() { return barcode; }
    public Instant getSearchedAt() { return searchedAt; }
}
