package com.healthscan.backend;

import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.entity.Product;
import com.healthscan.backend.entity.ProductAnalysis;
import com.healthscan.backend.repository.ProductAnalysisRepository;
import com.healthscan.backend.repository.ProductRepository;
import com.healthscan.backend.repository.WebSearchMissRepository;
import com.healthscan.backend.service.ProductLookupService;
import com.healthscan.backend.service.ProductLookupService.ProductInfo;
import com.healthscan.backend.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Runs the product service against a real PostgreSQL in a container, so the schema, constraints and
 * JSON columns are checked as production sees them. Skipped when Docker is not available.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers(disabledWithoutDocker = true)
@SuppressWarnings("null") // Reactor's Mono.just is not annotated, but this stub never returns null
class PostgresIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

    private static final String BARCODE = "3017620422003";
    private static final String ANALYSIS = """
            {"healthScore":20,"summary":"Sweet spread","pros":["Tasty"],"cons":["Sugar","Palm oil"],
             "origin":"Italy","ingredients":["sugar","palm oil"],"nutrition":"539 kcal"}""";

    @Autowired
    private ProductRepository repo;

    @Autowired
    private ProductAnalysisRepository analysisRepo;

    @Autowired
    private WebSearchMissRepository missRepo;

    private final ProductLookupService lookup = mock(ProductLookupService.class);
    // Path of each call to the AI service
    private final List<String> aiCalls = new ArrayList<>();
    private ProductService service;

    @BeforeEach
    void setUp() {
        WebClient ai = WebClient.builder().exchangeFunction(request -> {
            String path = request.url().getPath();
            aiCalls.add(path);
            String body = path.equals("/search-product") ? "{\"found\":false}" : ANALYSIS;
            return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", "application/json").body(body).build());
        }).build();
        service = new ProductService(repo, analysisRepo, missRepo, lookup, ai);
        when(lookup.lookup(BARCODE)).thenReturn(
                new ProductInfo("Nutella", "Ferrero", "", "sugar, palm oil", "Open Food Facts", "e", 4, 2));
    }

    @Test
    void scoredProductIsStoredAndServedFromTheDatabase() {
        ProductResponse first = service.analyzeProduct(BARCODE, "en");
        ProductResponse second = service.analyzeProduct(BARCODE, "en");

        // Grade E (15), NOVA 4 (-10), two additives (-4)
        assertThat(first.healthScore()).isEqualTo(1);
        assertThat(second.healthScore()).isEqualTo(1);
        assertThat(second.cons()).containsExactly("Sugar", "Palm oil");
        assertThat(aiCalls).as("second request comes from the database").hasSize(1);

        Product stored = repo.findByBarcode(BARCODE).orElseThrow();
        assertThat(stored.getNovaGroup()).isEqualTo(4);
        ProductAnalysis analysis = analysisRepo.findByProductAndLang(stored, "en").orElseThrow();
        assertThat(analysis.getScoreSource()).isEqualTo("Nutri-Score");
        assertThat(analysis.getProsJson()).isEqualTo("[\"Tasty\"]");
    }

    @Test
    void eachLanguageIsAnalyzedOnceAndKept() {
        service.analyzeProduct(BARCODE, "en");
        service.analyzeProduct(BARCODE, "el");
        service.analyzeProduct(BARCODE, "en");
        service.analyzeProduct(BARCODE, "el");

        // The databases are asked once, the AI once per language
        verify(lookup, times(1)).lookup(BARCODE);
        assertThat(aiCalls).hasSize(2);
        Product stored = repo.findByBarcode(BARCODE).orElseThrow();
        assertThat(analysisRepo.findByProductAndLang(stored, "en")).isPresent();
        assertThat(analysisRepo.findByProductAndLang(stored, "el")).isPresent();
        assertThat(analysisRepo.count()).isEqualTo(2);
    }

    @Test
    void failedWebSearchIsRememberedInTheDatabase() {
        assertThat(service.searchWeb("2900000017283", "en").found()).isFalse();
        assertThat(service.searchWeb("2900000017283", "en").found()).isFalse();

        assertThat(missRepo.findById("2900000017283")).isPresent();
        assertThat(aiCalls).as("second search answered from the database").hasSize(1);
    }

    @Test
    void barcodeIsUniqueInTheDatabase() {
        Product first = new Product();
        first.setBarcode(BARCODE);
        repo.saveAndFlush(first);
        Product duplicate = new Product();
        duplicate.setBarcode(BARCODE);

        assertThatThrownBy(() -> repo.saveAndFlush(duplicate)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aProductHasOneAnalysisPerLanguage() {
        Product product = new Product();
        product.setBarcode(BARCODE);
        repo.saveAndFlush(product);
        analysisRepo.saveAndFlush(new ProductAnalysis(product, "en"));

        assertThatThrownBy(() -> analysisRepo.saveAndFlush(new ProductAnalysis(product, "en")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void longNamesAndIngredientListsAreStored() {
        String longText = "x".repeat(6000);
        when(lookup.lookup(BARCODE)).thenReturn(
                new ProductInfo(longText, "", "https://example.com/" + longText, longText, "Open Food Facts"));

        service.analyzeProduct(BARCODE, "en");

        assertThat(repo.findByBarcode(BARCODE).orElseThrow().getIngredientsText()).hasSize(6000);
    }
}
