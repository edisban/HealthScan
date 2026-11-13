package com.healthscan.backend.service;

import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.entity.Product;
import com.healthscan.backend.entity.ProductAnalysis;
import com.healthscan.backend.entity.WebSearchMiss;
import com.healthscan.backend.repository.ProductAnalysisRepository;
import com.healthscan.backend.repository.ProductRepository;
import com.healthscan.backend.repository.WebSearchMissRepository;
import com.healthscan.backend.service.ProductLookupService.ProductInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null") // Fixtures and Mockito arguments never hold a real null here
class ProductServiceTest {

    private static final String BARCODE = "5201234567890";
    private static final String ANALYSIS = """
            {"barcode":"5201234567890","healthScore":72,"summary":"Fine","pros":["Protein"],
             "cons":["Sugar"],"productName":"AI name","origin":"Greece","ingredients":["milk"],"nutrition":"100 kcal"}""";
    private static final String NO_MATCH = "{\"found\":false}";
    private static final String IDENTIFIED = """
            {"found":true,"productName":"Yogurt","brand":"Fage","ingredients":"milk"}""";

    private final ProductRepository repo = mock(ProductRepository.class);
    private final ProductAnalysisRepository analysisRepo = mock(ProductAnalysisRepository.class);
    private final WebSearchMissRepository missRepo = mock(WebSearchMissRepository.class);
    private final ProductLookupService lookup = mock(ProductLookupService.class);

    // AI service stub: path -> JSON reply; a missing path behaves like an outage
    private final Map<String, String> aiReplies = new HashMap<>();
    private final List<String> aiCalls = new ArrayList<>();

    private ProductService service;

    @BeforeEach
    void setUp() {
        WebClient ai = WebClient.builder().exchangeFunction(request -> {
            String path = request.url().getPath();
            aiCalls.add(path);
            String reply = aiReplies.get(path);
            if (reply == null) return Mono.error(new IllegalStateException("AI service down"));
            return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", "application/json").body(reply).build());
        }).build();
        // Like the database: saving gives the product an id
        when(repo.save(any())).thenAnswer(call -> withId(call.getArgument(0)));
        service = new ProductService(repo, analysisRepo, missRepo, lookup, ai);
    }

    private static Product withId(Product product) {
        ReflectionTestUtils.setField(product, "id", 1L);
        return product;
    }

    /** A product already in the database, from the given source. */
    private Product givenRow(String source) {
        Product product = new Product();
        product.setBarcode(BARCODE);
        product.setName("Saved name");
        product.setIngredientsText("saved ingredients");
        product.setSource(source);
        withId(product);
        when(repo.findByBarcode(BARCODE)).thenReturn(Optional.of(product));
        return product;
    }

    /** A stored analysis of the product in one language. */
    private ProductAnalysis givenAnalysis(Product product, String lang, Integer score, String scoreSource) {
        ProductAnalysis analysis = new ProductAnalysis(product, lang);
        analysis.setHealthScore(score);
        analysis.setScoreSource(scoreSource);
        analysis.setExplanation("Saved explanation");
        when(analysisRepo.findByProductAndLang(any(), eq(lang))).thenReturn(Optional.of(analysis));
        if (scoreSource != null) when(analysisRepo.existsByProductAndScoreSourceIsNotNull(any())).thenReturn(true);
        return analysis;
    }

    private void givenDatabaseHit() {
        when(lookup.lookup(BARCODE)).thenReturn(new ProductInfo("Db name", "Fage", "", "milk", "Open Food Facts"));
    }

    private Product savedProduct() {
        ArgumentCaptor<Product> saved = ArgumentCaptor.forClass(Product.class);
        verify(repo).save(saved.capture());
        return saved.getValue();
    }

    private ProductAnalysis savedAnalysis() {
        ArgumentCaptor<ProductAnalysis> saved = ArgumentCaptor.forClass(ProductAnalysis.class);
        verify(analysisRepo).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void scoredAnalysisInSameLanguageIsServedWithoutExternalCalls() {
        givenAnalysis(givenRow("Open Food Facts"), "en", 40, "AI estimate");

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        assertThat(response.healthScore()).isEqualTo(40);
        assertThat(response.explanation()).isEqualTo("Saved explanation");
        verify(lookup, never()).lookup(any());
        assertThat(aiCalls).isEmpty();
    }

    @Test
    void languageSwitchAsksOnlyTheAiAndKeepsBothLanguages() {
        givenAnalysis(givenRow("Open Food Facts"), "en", 40, "AI estimate");
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeProduct(BARCODE, "el");

        assertThat(response.healthScore()).isEqualTo(72);
        assertThat(response.name()).isEqualTo("Saved name");
        verify(lookup, never()).lookup(any());
        assertThat(aiCalls).containsExactly("/analyze");
        // A new row for Greek; the English one is left as it was
        assertThat(savedAnalysis().getLang()).isEqualTo("el");
        verify(repo, never()).save(any());
    }

    @Test
    void productSavedBeforeCalculatedScoresIsLookedUpAgain() {
        ProductAnalysis old = givenAnalysis(givenRow("Open Food Facts"), "en", 40, null);
        when(lookup.lookup(BARCODE)).thenReturn(
                new ProductInfo("Db name", "Fage", "", "milk", "Open Food Facts", "b", 1, 0));
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        assertThat(response.healthScore()).isEqualTo(72);
        assertThat(response.scoreSource()).isEqualTo("Nutri-Score");
        assertThat(savedProduct().getNutriScore()).isEqualTo("b");
        // The old analysis is updated in place, not duplicated
        assertThat(savedAnalysis()).isSameAs(old);
    }

    @Test
    void newProductIsLookedUpScoredAndSaved() {
        givenDatabaseHit();
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        assertThat(response.found()).isTrue();
        assertThat(response.healthScore()).isEqualTo(72);
        assertThat(response.source()).isEqualTo("Open Food Facts");
        assertThat(response.pros()).containsExactly("Protein");
        assertThat(savedProduct().getName()).isEqualTo("Db name");
        ProductAnalysis analysis = savedAnalysis();
        assertThat(analysis.getLang()).isEqualTo("en");
        assertThat(analysis.getProsJson()).isEqualTo("[\"Protein\"]");
        assertThat(analysis.getAnalyzedAt()).isNotNull();
    }

    @Test
    void productWhoseAnalysisFailedIsAnalyzedAgain() {
        givenRow("Open Food Facts");
        givenDatabaseHit();
        aiReplies.put("/analyze", ANALYSIS);

        assertThat(service.analyzeProduct(BARCODE, "en").healthScore()).isEqualTo(72);
    }

    @Test
    void labelPhotoProductSurvivesALanguageChange() {
        givenAnalysis(givenRow("Label photo"), "en", 40, "AI estimate");
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeProduct(BARCODE, "el");

        assertThat(response.found()).isTrue();
        assertThat(response.name()).isEqualTo("Saved name");
        assertThat(response.source()).isEqualTo("Label photo");
        verify(lookup, never()).lookup(any());
        verify(repo, never()).save(any());
    }

    @Test
    void unknownBarcodeIsNotFoundAndNotSaved() {
        assertThat(service.analyzeProduct(BARCODE, "en").found()).isFalse();
        verify(repo, never()).save(any());
        verify(analysisRepo, never()).save(any());
    }

    @Test
    void aiOutageKeepsTheProductButStoresNoAnalysis() {
        givenDatabaseHit();

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        assertThat(response.found()).isTrue();
        assertThat(response.healthScore()).isNull();
        assertThat(savedProduct().getName()).isEqualTo("Db name");
        verify(analysisRepo, never()).save(any());
    }

    @Test
    void concurrentProductInsertStillReturnsTheAnalysis() {
        Product other = new Product();
        other.setBarcode(BARCODE);
        other.setName("Db name");
        withId(other);
        // The first look finds nothing; after the duplicate insert the other request's row is there
        when(repo.findByBarcode(BARCODE)).thenReturn(Optional.empty()).thenReturn(Optional.of(other));
        doThrow(new DataIntegrityViolationException("duplicate barcode")).when(repo).save(any());
        givenDatabaseHit();
        aiReplies.put("/analyze", ANALYSIS);

        assertThat(service.analyzeProduct(BARCODE, "en").healthScore()).isEqualTo(72);
        assertThat(savedAnalysis().getProduct()).isSameAs(other);
    }

    @Test
    void concurrentAnalysisInTheSameLanguageStillReturnsIt() {
        givenDatabaseHit();
        aiReplies.put("/analyze", ANALYSIS);
        when(analysisRepo.save(any())).thenThrow(new DataIntegrityViolationException("duplicate language"));

        assertThat(service.analyzeProduct(BARCODE, "en").healthScore()).isEqualTo(72);
    }

    @Test
    void webSearchNeverReplacesAnExistingRow() {
        givenAnalysis(givenRow("Label photo"), "en", 40, "AI estimate");

        ProductResponse response = service.searchWeb(BARCODE, "en");

        assertThat(response.source()).isEqualTo("Label photo");
        assertThat(aiCalls).doesNotContain("/search-product");
    }

    @Test
    void webSearchMatchIsScoredAndLabelled() {
        aiReplies.put("/search-product", IDENTIFIED);
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.searchWeb(BARCODE, "en");

        assertThat(response.name()).isEqualTo("Yogurt");
        assertThat(response.source()).isEqualTo("Web search");
        assertThat(aiCalls).containsExactly("/search-product", "/analyze");
        verify(missRepo, never()).save(any());
    }

    @Test
    void webSearchNoMatchIsRemembered() {
        aiReplies.put("/search-product", NO_MATCH);

        assertThat(service.searchWeb(BARCODE, "en").found()).isFalse();

        ArgumentCaptor<WebSearchMiss> miss = ArgumentCaptor.forClass(WebSearchMiss.class);
        verify(missRepo).save(miss.capture());
        assertThat(miss.getValue().getBarcode()).isEqualTo(BARCODE);
    }

    @Test
    void recentMissSkipsTheSearch() {
        Instant anHourAgo = Instant.now().minus(Duration.ofHours(1));
        when(missRepo.findById(BARCODE)).thenReturn(Optional.of(new WebSearchMiss(BARCODE, anHourAgo)));

        assertThat(service.searchWeb(BARCODE, "en").found()).isFalse();
        assertThat(aiCalls).isEmpty();
    }

    @Test
    void missOlderThanADayIsSearchedAgain() {
        Instant twoDaysAgo = Instant.now().minus(Duration.ofDays(2));
        when(missRepo.findById(BARCODE)).thenReturn(Optional.of(new WebSearchMiss(BARCODE, twoDaysAgo)));
        aiReplies.put("/search-product", NO_MATCH);

        service.searchWeb(BARCODE, "en");

        assertThat(aiCalls).containsExactly("/search-product");
    }

    @Test
    void aiOutageDuringSearchIsNotRememberedAsAMiss() {
        assertThat(service.searchWeb(BARCODE, "en").found()).isFalse();
        verify(missRepo, never()).save(any());
    }

    @Test
    void readableLabelIsScoredAndLabelled() {
        aiReplies.put("/read-label", IDENTIFIED);
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeLabel(BARCODE, new byte[] {1, 2, 3}, "en");

        assertThat(response.source()).isEqualTo("Label photo");
        assertThat(response.healthScore()).isEqualTo(72);
        assertThat(savedProduct().getSource()).isEqualTo("Label photo");
    }

    @Test
    void nutriScoreProductGetsTheCalculatedScoreNotTheAiNumber() {
        when(lookup.lookup(BARCODE)).thenReturn(
                new ProductInfo("Db name", "Fage", "", "milk", "Open Food Facts", "c", 4, 3));
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        // 55 for grade C, minus 10 for NOVA 4, minus 6 for three additives; the AI said 72
        assertThat(response.healthScore()).isEqualTo(39);
        assertThat(response.scoreSource()).isEqualTo("Nutri-Score");
        assertThat(response.nutriScore()).isEqualTo("c");
        assertThat(response.novaGroup()).isEqualTo(4);
        assertThat(response.explanation()).isEqualTo("Fine");
        assertThat(savedAnalysis().getHealthScore()).isEqualTo(39);
    }

    @Test
    void calculatedScoreSurvivesAnAiOutage() {
        when(lookup.lookup(BARCODE)).thenReturn(
                new ProductInfo("Db name", "Fage", "", "milk", "Open Food Facts", "a", 1, 0));

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        assertThat(response.healthScore()).isEqualTo(90);
        assertThat(response.scoreSource()).isEqualTo("Nutri-Score");
        // Nothing is stored for the language, so the next scan asks the AI again for the text
        verify(analysisRepo, never()).save(any());
    }

    @Test
    void productWithoutNutriScoreIsMarkedAsAnAiEstimate() {
        givenDatabaseHit();
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        assertThat(response.healthScore()).isEqualTo(72);
        assertThat(response.scoreSource()).isEqualTo("AI estimate");
    }

    @Test
    void labelPhotoNeverReplacesAnExistingProduct() {
        givenAnalysis(givenRow("Open Food Facts"), "en", 40, "AI estimate");
        aiReplies.put("/read-label", IDENTIFIED);

        ProductResponse response = service.analyzeLabel(BARCODE, new byte[] {1, 2, 3}, "en");

        assertThat(response.source()).isEqualTo("Open Food Facts");
        assertThat(response.name()).isEqualTo("Saved name");
        assertThat(aiCalls).doesNotContain("/read-label");
        verify(repo, never()).save(any());
    }

    @Test
    void unreadableLabelIsNotFound() {
        aiReplies.put("/read-label", NO_MATCH);

        assertThat(service.analyzeLabel(BARCODE, new byte[] {1, 2, 3}, "en").found()).isFalse();
        verify(repo, never()).save(any());
    }
}
