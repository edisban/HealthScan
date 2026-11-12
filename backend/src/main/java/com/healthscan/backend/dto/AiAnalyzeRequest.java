package com.healthscan.backend.dto;

/**
 * What the backend asks the AI service to score and explain.
 *
 * @param ingredients the ingredient text exactly as the source wrote it (not split on commas)
 * @param fixedScore  set when the score comes from Nutri-Score data; the AI must keep it and only explain it
 * @param facts       the data behind a fixed score, e.g. "Nutri-Score C, NOVA group 4, 3 additives"
 */
public record AiAnalyzeRequest(String barcode, String name, String ingredients, String lang,
                               Integer fixedScore, String facts) {}
