package com.healthscan.backend.service;

import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.entity.Product;
import com.healthscan.backend.entity.WebSearchMiss;
import com.healthscan.backend.repository.ProductRepository;
import com.healthscan.backend.repository.WebSearchMissRepository;
import com.healthscan.backend.service.ProductLookupService.ProductInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
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
        service = new ProductService(repo, missRepo, lookup, ai);
    }

    private static Product row(Integer score, String lang, String source) {
        Product product = new Product();
        product.setBarcode(BARCODE);
        product.setName("Saved name");
        product.setIngredientsText("saved ingredients");
        product.setHealthScore(score);
        product.setLang(lang);
        product.setSource(source);
        return product;
    }

    private void givenRow(Product product) {
        when(repo.findByBarcode(BARCODE)).thenReturn(Optional.of(product));
    }

    private void givenDatabaseHit() {
        when(lookup.lookup(BARCODE)).thenReturn(new ProductInfo("Db name", "Fage", "", "milk", "Open Food Facts"));
    }

    private Product savedProduct() {
        ArgumentCaptor<Product> saved = ArgumentCaptor.forClass(Product.class);
        verify(repo).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void scoredRowInSameLanguageIsServedWithoutExternalCalls() {
        givenRow(row(40, "en", "Open Food Facts"));

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        assertThat(response.getHealthScore()).isEqualTo(40);
        verify(lookup, never()).lookup(any());
        assertThat(aiCalls).isEmpty();
    }

    @Test
    void newProductIsLookedUpScoredAndSaved() {
        givenDatabaseHit();
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        assertThat(response.isFound()).isTrue();
        assertThat(response.getHealthScore()).isEqualTo(72);
        assertThat(response.getSource()).isEqualTo("Open Food Facts");
        assertThat(response.getPros()).containsExactly("Protein");
        Product saved = savedProduct();
        assertThat(saved.getLang()).isEqualTo("en");
        assertThat(saved.getProsJson()).isEqualTo("[\"Protein\"]");
    }

    @Test
    void rowWithoutScoreIsAnalyzedAgain() {
        givenRow(row(null, null, "Open Food Facts"));
        givenDatabaseHit();
        aiReplies.put("/analyze", ANALYSIS);

        assertThat(service.analyzeProduct(BARCODE, "en").getHealthScore()).isEqualTo(72);
    }

    @Test
    void rowInOtherLanguageIsAnalyzedAgain() {
        givenRow(row(40, "en", "Open Food Facts"));
        givenDatabaseHit();
        aiReplies.put("/analyze", ANALYSIS);

        service.analyzeProduct(BARCODE, "el");

        assertThat(savedProduct().getLang()).isEqualTo("el");
    }

    @Test
    void labelPhotoProductSurvivesALanguageChange() {
        givenRow(row(40, "en", "Label photo"));
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeProduct(BARCODE, "el");

        assertThat(response.isFound()).isTrue();
        assertThat(response.getName()).isEqualTo("Saved name");
        assertThat(response.getSource()).isEqualTo("Label photo");
        assertThat(savedProduct().getIngredientsText()).isEqualTo("saved ingredients");
    }

    @Test
    void unknownBarcodeIsNotFoundAndNotSaved() {
        assertThat(service.analyzeProduct(BARCODE, "en").isFound()).isFalse();
        verify(repo, never()).save(any());
    }

    @Test
    void aiOutageSavesTheRowWithoutAScore() {
        givenDatabaseHit();

        ProductResponse response = service.analyzeProduct(BARCODE, "en");

        assertThat(response.isFound()).isTrue();
        assertThat(response.getHealthScore()).isNull();
        assertThat(savedProduct().getHealthScore()).isNull();
    }

    @Test
    void concurrentInsertStillReturnsTheAnalysis() {
        givenDatabaseHit();
        aiReplies.put("/analyze", ANALYSIS);
        when(repo.save(any())).thenThrow(new DataIntegrityViolationException("duplicate barcode"));

        assertThat(service.analyzeProduct(BARCODE, "en").getHealthScore()).isEqualTo(72);
    }

    @Test
    void webSearchNeverReplacesAnExistingRow() {
        givenRow(row(40, "en", "Label photo"));

        ProductResponse response = service.searchWeb(BARCODE, "en");

        assertThat(response.getSource()).isEqualTo("Label photo");
        assertThat(aiCalls).doesNotContain("/search-product");
    }

    @Test
    void webSearchMatchIsScoredAndLabelled() {
        aiReplies.put("/search-product", IDENTIFIED);
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.searchWeb(BARCODE, "en");

        assertThat(response.getName()).isEqualTo("Yogurt");
        assertThat(response.getSource()).isEqualTo("Web search");
        assertThat(aiCalls).containsExactly("/search-product", "/analyze");
        verify(missRepo, never()).save(any());
    }

    @Test
    void webSearchNoMatchIsRemembered() {
        aiReplies.put("/search-product", NO_MATCH);

        assertThat(service.searchWeb(BARCODE, "en").isFound()).isFalse();

        ArgumentCaptor<WebSearchMiss> miss = ArgumentCaptor.forClass(WebSearchMiss.class);
        verify(missRepo).save(miss.capture());
        assertThat(miss.getValue().getBarcode()).isEqualTo(BARCODE);
    }

    @Test
    void recentMissSkipsTheSearch() {
        Instant anHourAgo = Instant.now().minus(Duration.ofHours(1));
        when(missRepo.findById(BARCODE)).thenReturn(Optional.of(new WebSearchMiss(BARCODE, anHourAgo)));

        assertThat(service.searchWeb(BARCODE, "en").isFound()).isFalse();
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
        assertThat(service.searchWeb(BARCODE, "en").isFound()).isFalse();
        verify(missRepo, never()).save(any());
    }

    @Test
    void readableLabelIsScoredAndLabelled() {
        aiReplies.put("/read-label", IDENTIFIED);
        aiReplies.put("/analyze", ANALYSIS);

        ProductResponse response = service.analyzeLabel(BARCODE, new byte[] {1, 2, 3}, "en");

        assertThat(response.getSource()).isEqualTo("Label photo");
        assertThat(response.getHealthScore()).isEqualTo(72);
    }

    @Test
    void unreadableLabelIsNotFound() {
        aiReplies.put("/read-label", NO_MATCH);

        assertThat(service.analyzeLabel(BARCODE, new byte[] {1, 2, 3}, "en").isFound()).isFalse();
        verify(repo, never()).save(any());
    }
}
