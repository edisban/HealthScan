package com.healthscan.backend.dto;

import java.util.List;

/**
 * A product as the app shows it.
 *
 * @param found       false when no database, label photo or web search identified the barcode
 * @param source      where the product data came from, e.g. "Open Food Facts", "Label photo", "Web search"
 * @param healthScore 0 to 100, or null when the analysis failed
 * @param scoreSource "Nutri-Score" when calculated, "AI estimate" otherwise
 */
public record ProductResponse(
        String barcode,
        boolean found,
        String name,
        String imageUrl,
        String source,
        Integer healthScore,
        String scoreSource,
        String nutriScore,
        Integer novaGroup,
        String explanation,
        String origin,
        String nutrition,
        List<String> ingredients,
        List<String> pros,
        List<String> cons) {

    public static ProductResponse notFound(String barcode) {
        return new ProductResponse(barcode, false, "", "", "", null, "", "", null, "", "", "",
                List.of(), List.of(), List.of());
    }
}
