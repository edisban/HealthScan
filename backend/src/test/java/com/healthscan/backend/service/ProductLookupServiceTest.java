package com.healthscan.backend.service;

import com.healthscan.backend.service.ProductLookupService.ProductInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;

@SuppressWarnings("null") // Reactor's Mono.just is not annotated, but these stubs never return null
class ProductLookupServiceTest {

    private static final String BARCODE = "5201234567890";
    private static final String FOOD = "world.openfoodfacts.org";
    private static final String BEAUTY = "world.openbeautyfacts.org";
    private static final String PRODUCTS = "world.openproductsfacts.org";
    private static final String UPC = "api.upcitemdb.com";
    private static final String USDA = "api.nal.usda.gov";
    private static final String OPEN_FACTS_HIT = """
            {"status":1,"product":{"product_name":"Yogurt","brands":"Fage, Other",
             "image_url":"http://img/1.jpg","ingredients_text":"milk"}}""";

    // Database stub: host -> JSON reply (a missing host answers 404) and an optional delay before replying
    private final Map<String, String> replies = new ConcurrentHashMap<>();
    private final Map<String, Duration> delays = new ConcurrentHashMap<>();
    private final List<String> hostsCalled = new CopyOnWriteArrayList<>();

    private WebClient web;
    private ProductLookupService service;

    @BeforeEach
    void setUp() {
        web = WebClient.builder().exchangeFunction(request -> {
            String host = request.url().getHost();
            hostsCalled.add(host);
            String reply = replies.get(host);
            ClientResponse response = reply == null
                    ? ClientResponse.create(HttpStatus.NOT_FOUND).build()
                    : ClientResponse.create(HttpStatus.OK).header("Content-Type", "application/json").body(reply).build();
            Duration delay = delays.get(host);
            return delay == null ? Mono.just(response) : Mono.just(response).delayElement(delay);
        }).build();
        service = new ProductLookupService(web, "test-key");
    }

    @Test
    void openFactsHitSkipsTheQuotaLimitedDatabases() {
        replies.put(FOOD, OPEN_FACTS_HIT);

        ProductInfo info = service.lookup(BARCODE);

        assertThat(info.name()).isEqualTo("Yogurt");
        assertThat(info.brand()).isEqualTo("Fage");
        assertThat(info.ingredients()).isEqualTo("milk");
        assertThat(info.source()).isEqualTo("Open Food Facts");
        assertThat(hostsCalled).doesNotContain(UPC, USDA);
    }

    @Test
    void failedSourceMovesToTheNextOne() {
        replies.put(BEAUTY, OPEN_FACTS_HIT);

        assertThat(service.lookup(BARCODE).source()).isEqualTo("Open Beauty Facts");
        assertThat(hostsCalled).contains(FOOD, BEAUTY).doesNotContain(UPC, USDA);
    }

    @Test
    void priorityWinsOverTheFasterReply() {
        replies.put(FOOD, OPEN_FACTS_HIT);
        replies.put(PRODUCTS, OPEN_FACTS_HIT);
        delays.put(FOOD, Duration.ofMillis(300));

        assertThat(service.lookup(BARCODE).source()).isEqualTo("Open Food Facts");
    }

    @Test
    void openFactsDatabasesAreAskedAtTheSameTime() {
        Duration slow = Duration.ofMillis(600);
        delays.put(FOOD, slow);
        delays.put(BEAUTY, slow);
        delays.put(PRODUCTS, slow);
        replies.put(PRODUCTS, OPEN_FACTS_HIT);

        long start = System.nanoTime();
        ProductInfo info = service.lookup(BARCODE);
        Duration took = Duration.ofNanos(System.nanoTime() - start);

        assertThat(info.source()).isEqualTo("Open Products Facts");
        // One after the other would take three delays
        assertThat(took).isLessThan(slow.multipliedBy(2));
    }

    @Test
    void slowDatabaseCountsAsAMiss() {
        replies.put(FOOD, OPEN_FACTS_HIT);
        replies.put(BEAUTY, OPEN_FACTS_HIT);
        delays.put(FOOD, Duration.ofSeconds(5));
        ProductLookupService impatient = new ProductLookupService(web, "test-key", Duration.ofMillis(200));

        assertThat(impatient.lookup(BARCODE).source()).isEqualTo("Open Beauty Facts");
    }

    @Test
    void recordWithoutANameIsTreatedAsAMiss() {
        replies.put(FOOD, "{\"status\":1,\"product\":{\"product_name\":\"\"}}");
        replies.put(PRODUCTS, OPEN_FACTS_HIT);

        assertThat(service.lookup(BARCODE).source()).isEqualTo("Open Products Facts");
    }

    @Test
    void replyThatIsNotJsonIsTreatedAsAMiss() {
        replies.put(FOOD, "<html>Service unavailable</html>");
        replies.put(BEAUTY, OPEN_FACTS_HIT);

        assertThat(service.lookup(BARCODE).source()).isEqualTo("Open Beauty Facts");
    }

    @Test
    void upcItemDbHasNoIngredients() {
        replies.put(UPC, "{\"items\":[{\"title\":\"Shampoo\",\"brand\":\"Acme\",\"images\":[\"http://img/2.jpg\"]}]}");

        ProductInfo info = service.lookup(BARCODE);

        assertThat(info.source()).isEqualTo("UPCitemdb");
        assertThat(info.ingredients()).isEmpty();
    }

    @Test
    void upcItemDbComesBeforeUsda() {
        replies.put(UPC, "{\"items\":[{\"title\":\"Shampoo\"}]}");
        replies.put(USDA, "{\"foods\":[{\"gtinUpc\":\"5201234567890\",\"description\":\"Oats\"}]}");
        delays.put(UPC, Duration.ofMillis(300));

        assertThat(service.lookup(BARCODE).source()).isEqualTo("UPCitemdb");
    }

    @Test
    void usdaResultMustMatchTheBarcodeIgnoringLeadingZeros() {
        replies.put(USDA, """
                {"foods":[
                  {"gtinUpc":"999","description":"Wrong food"},
                  {"gtinUpc":"005201234567890","description":"Right food","brandName":"Acme","ingredients":"oats"}
                ]}""");

        ProductInfo info = service.lookup(BARCODE);

        assertThat(info.name()).isEqualTo("Right food");
        assertThat(info.source()).isEqualTo("USDA");
    }

    @Test
    void usdaResultForAnotherBarcodeIsIgnored() {
        replies.put(USDA, "{\"foods\":[{\"gtinUpc\":\"999\",\"description\":\"Wrong food\"}]}");

        assertThat(service.lookup(BARCODE)).isNull();
    }

    @Test
    void nonNumericBarcodeSkipsUpcItemDbAndUsda() {
        service.lookup("ABC-123");

        assertThat(hostsCalled).containsExactlyInAnyOrder(FOOD, BEAUTY, PRODUCTS);
    }

    @Test
    void readsNutriScoreNovaAndAdditivesFromOpenFoodFacts() {
        replies.put(FOOD, """
                {"status":1,"product":{"product_name":"Yogurt","nutriscore_grade":"B","nova_group":3,"additives_n":2}}""");

        ProductInfo info = service.lookup(BARCODE);

        assertThat(info.nutriScore()).isEqualTo("b");
        assertThat(info.novaGroup()).isEqualTo(3);
        assertThat(info.additives()).isEqualTo(2);
    }

    @Test
    void unknownNutriScoreGradeIsIgnored() {
        replies.put(FOOD, """
                {"status":1,"product":{"product_name":"Water","nutriscore_grade":"not-applicable"}}""");

        ProductInfo info = service.lookup(BARCODE);

        assertThat(info.nutriScore()).isEmpty();
        assertThat(info.novaGroup()).isNull();
    }

    @Test
    void unknownEverywhereReturnsNull() {
        assertThat(service.lookup(BARCODE)).isNull();
        assertThat(hostsCalled).containsExactlyInAnyOrder(FOOD, BEAUTY, PRODUCTS, UPC, USDA);
    }
}
