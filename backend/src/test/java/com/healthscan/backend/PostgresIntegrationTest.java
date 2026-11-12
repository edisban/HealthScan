package com.healthscan.backend;

import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.entity.Product;
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
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Runs the product service against a real PostgreSQL in a container, so the schema, column limits and
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
    private WebSearchMissRepository missRepo;

    private final ProductLookupService lookup = mock(ProductLookupService.class);
    private final AtomicInteger aiCalls = new AtomicInteger();
    private ProductService service;

    @BeforeEach
    void setUp() {
        WebClient ai = WebClient.builder().exchangeFunction(request -> {
            aiCalls.incrementAndGet();
            String path = request.url().getPath();
            String body = path.equals("/search-product") ? "{\"found\":false}" : ANALYSIS;
            return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", "application/json").body(body).build());
        }).build();
        service = new ProductService(repo, missRepo, lookup, ai);
    }

    @Test
    void scoredProductIsStoredAndServedFromTheDatabase() {
        when(lookup.lookup(BARCODE)).thenReturn(
                new ProductInfo("Nutella", "Ferrero", "", "sugar, palm oil", "Open Food Facts", "e", 4, 2));

        ProductResponse first = service.analyzeProduct(BARCODE, "en");
        ProductResponse second = service.analyzeProduct(BARCODE, "en");

        // Grade E (15), NOVA 4 (-10), two additives (-4)
        assertThat(first.getHealthScore()).isEqualTo(1);
        assertThat(second.getHealthScore()).isEqualTo(1);
        assertThat(second.getCons()).containsExactly("Sugar", "Palm oil");
        assertThat(aiCalls.get()).as("second request comes from the database").isEqualTo(1);

        Product stored = repo.findByBarcode(BARCODE).orElseThrow();
        assertThat(stored.getScoreSource()).isEqualTo("Nutri-Score");
        assertThat(stored.getNovaGroup()).isEqualTo(4);
        assertThat(stored.getProsJson()).isEqualTo("[\"Tasty\"]");
    }

    @Test
    void failedWebSearchIsRememberedInTheDatabase() {
        assertThat(service.searchWeb("2900000017283", "en").isFound()).isFalse();
        assertThat(service.searchWeb("2900000017283", "en").isFound()).isFalse();

        assertThat(missRepo.findById("2900000017283")).isPresent();
        assertThat(aiCalls.get()).as("second search answered from the database").isEqualTo(1);
    }

    @Test
    void barcodeIsUniqueInTheDatabase() {
        Product first = new Product();
        first.setBarcode(BARCODE);
        repo.saveAndFlush(first);
        Product duplicate = new Product();
        duplicate.setBarcode(BARCODE);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> repo.saveAndFlush(duplicate))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
}
