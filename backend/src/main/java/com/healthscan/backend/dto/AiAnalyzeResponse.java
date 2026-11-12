package com.healthscan.backend.dto;

import java.util.List;

/** The AI service's analysis of a product. */
public record AiAnalyzeResponse(Integer healthScore, String summary, List<String> pros, List<String> cons,
                                String origin, List<String> ingredients, String nutrition) {}
