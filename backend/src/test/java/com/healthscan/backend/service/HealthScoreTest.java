package com.healthscan.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class HealthScoreTest {

    @ParameterizedTest
    @CsvSource({"a, 90", "b, 72", "c, 55", "d, 35", "e, 15", "A, 90"})
    void eachGradeHasAStartingScore(String grade, int expected) {
        assertThat(HealthScore.fromOpenFoodFacts(grade, null, null)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"1, 55", "2, 55", "3, 50", "4, 45"})
    void processedFoodsLosePoints(int nova, int expected) {
        assertThat(HealthScore.fromOpenFoodFacts("c", nova, null)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"0, 55", "1, 53", "3, 49", "5, 45", "20, 45"})
    void additivesCostTwoPointsUpToTen(int additives, int expected) {
        assertThat(HealthScore.fromOpenFoodFacts("c", null, additives)).isEqualTo(expected);
    }

    @Test
    void penaltiesAddUpButNeverGoBelowZero() {
        assertThat(HealthScore.fromOpenFoodFacts("e", 4, 20)).isEqualTo(0);
        assertThat(HealthScore.fromOpenFoodFacts("d", 4, 3)).isEqualTo(19);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"unknown", "not-applicable", "f"})
    void noUsableGradeMeansNoCalculatedScore(String grade) {
        assertThat(HealthScore.fromOpenFoodFacts(grade, 4, 3)).isNull();
    }

    @Test
    void describesTheFactsBehindTheScore() {
        assertThat(HealthScore.describe("c", 4, 3)).isEqualTo("Nutri-Score C, NOVA group 4, 3 additives");
        assertThat(HealthScore.describe("a", null, 1)).isEqualTo("Nutri-Score A, 1 additive");
        assertThat(HealthScore.describe("", null, null)).isEmpty();
    }
}
