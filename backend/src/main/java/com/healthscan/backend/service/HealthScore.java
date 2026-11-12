package com.healthscan.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The deterministic health score: built from Open Food Facts' Nutri-Score, NOVA group and additive count,
 * so the same product always gets the same score. Products without a Nutri-Score fall back to the AI estimate.
 */
public final class HealthScore {

    public static final String NUTRI_SCORE = "Nutri-Score";
    public static final String AI_ESTIMATE = "AI estimate";

    // Starting point per Nutri-Score grade
    private static final Map<String, Integer> BASE = Map.of("a", 90, "b", 72, "c", 55, "d", 35, "e", 15);
    // Ultra-processed (NOVA 4) and processed (NOVA 3) foods lose points
    private static final int NOVA_4_PENALTY = 10;
    private static final int NOVA_3_PENALTY = 5;
    // Each additive costs 2 points, up to 10
    private static final int ADDITIVE_PENALTY = 2;
    private static final int MAX_ADDITIVE_PENALTY = 10;

    private HealthScore() {}

    /** Returns true for the grades the formula uses: a to e. */
    public static boolean isGrade(String grade) {
        return grade != null && BASE.containsKey(grade.toLowerCase(Locale.ROOT));
    }

    /** Returns the 0 to 100 score, or null when there is no usable Nutri-Score grade. */
    public static Integer fromOpenFoodFacts(String grade, Integer novaGroup, Integer additives) {
        if (!isGrade(grade)) return null;
        int score = BASE.get(grade.toLowerCase(Locale.ROOT));
        if (novaGroup != null && novaGroup == 4) score -= NOVA_4_PENALTY;
        if (novaGroup != null && novaGroup == 3) score -= NOVA_3_PENALTY;
        if (additives != null && additives > 0) score -= Math.min(additives * ADDITIVE_PENALTY, MAX_ADDITIVE_PENALTY);
        return Math.max(0, Math.min(100, score));
    }

    /** A short fact line for the AI prompt and the app, e.g. "Nutri-Score C, NOVA group 4, 3 additives". */
    public static String describe(String grade, Integer novaGroup, Integer additives) {
        List<String> parts = new ArrayList<>();
        if (isGrade(grade)) parts.add("Nutri-Score " + grade.toUpperCase(Locale.ROOT));
        if (novaGroup != null) parts.add("NOVA group " + novaGroup);
        if (additives != null) parts.add(additives + (additives == 1 ? " additive" : " additives"));
        return String.join(", ", parts);
    }
}
