package com.healthscan.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthscan.backend.config.HealthscanProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.function.Function;

/**
 * Looks a barcode up in several free product databases and returns the hit from the first one in priority order.
 * The three Open Facts databases are asked at the same time; UPCitemdb and USDA, which have small free quotas,
 * are asked (also together) only when all three miss.
 */
@Service
public class ProductLookupService {

    /** Nutri-Score grade (a to e, else empty), NOVA group and additive count come from Open Food Facts only. */
    public record ProductInfo(String name, String brand, String imageUrl, String ingredients, String source,
                              String nutriScore, Integer novaGroup, Integer additives) {
        public ProductInfo(String name, String brand, String imageUrl, String ingredients, String source) {
            this(name, brand, imageUrl, ingredients, source, "", null, null);
        }
    }

    // Only request the fields we use; full Open Facts records can be hundreds of KB
    private static final String OPEN_FACTS_FIELDS = String.join(",",
            "product_name", "product_name_el", "product_name_en", "generic_name", "brands",
            "image_url", "image_front_url", "ingredients_text", "ingredients_text_el", "ingredients_text_en",
            "nutriscore_grade", "nova_group", "additives_n");
    // Per database; databases asked together share the wait, so a lookup takes at most twice this
    private static final Duration TIMEOUT = Duration.ofSeconds(8);
    private static final Logger log = LoggerFactory.getLogger(ProductLookupService.class);

    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();
    private final String usdaKey;
    private final Duration timeout;

    /** @param builder Spring's shared builder, so the app's codecs and metrics apply to these calls too */
    @Autowired
    public ProductLookupService(WebClient.Builder builder, HealthscanProperties properties) {
        this(builder.clone()
                // Open Food Facts asks API users to identify their app
                .defaultHeader("User-Agent", "HealthScan/1.0")
                .codecs(c -> c.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build(), properties.usdaApiKey());
    }

    // Lets tests replace the product databases with a stub
    ProductLookupService(WebClient webClient, String key) {
        this(webClient, key, TIMEOUT);
    }

    ProductLookupService(WebClient webClient, String key, Duration timeout) {
        this.webClient = webClient;
        this.usdaKey = (key == null || key.isBlank()) ? "DEMO_KEY" : key;
        this.timeout = timeout;
    }

    /** Returns the product from the first database that knows the barcode, or null if none does. */
    public ProductInfo lookup(String barcode) {
        ProductInfo hit = firstHit(List.of(
                openFacts("https://world.openfoodfacts.org", "Open Food Facts", barcode),
                openFacts("https://world.openbeautyfacts.org", "Open Beauty Facts", barcode),
                openFacts("https://world.openproductsfacts.org", "Open Products Facts", barcode)));
        if (hit != null) return hit;
        return firstHit(List.of(upcItemDb(barcode), usda(barcode)));
    }

    /**
     * Asks all sources at once. A miss is an empty source and the results keep the list's order,
     * so the first value is the best hit by priority; the slower sources are then cancelled.
     */
    private static ProductInfo firstHit(List<Mono<ProductInfo>> sources) {
        return Flux.mergeSequential(sources).next().block();
    }

    /** One database lookup: empty when the product is unknown there, the call fails or it takes too long. */
    private Mono<ProductInfo> source(String name, String barcode, @NonNull String url,
                                     Function<JsonNode, ProductInfo> parse) {
        return webClient.get().uri(url).retrieve().bodyToMono(String.class)
                .timeout(timeout)
                .map(this::readJson)
                .mapNotNull(parse)
                .onErrorResume(e -> {
                    // Not found (404), rate limited or unreachable: the other databases still count
                    log.debug("{} lookup failed for {}: {}", name, barcode, e.toString());
                    return Mono.empty();
                });
    }

    private Mono<ProductInfo> openFacts(String baseUrl, String sourceName, String barcode) {
        return source(sourceName, barcode, baseUrl + "/api/v2/product/" + barcode + ".json?fields=" + OPEN_FACTS_FIELDS,
                root -> parseOpenFacts(root, sourceName));
    }

    private static ProductInfo parseOpenFacts(JsonNode root, String sourceName) {
        JsonNode p = root.path("product");
        if (root.path("status").asInt(0) != 1 || p.isMissingNode()) return null;
        String name = firstNonBlank(p, "product_name", "product_name_el", "product_name_en", "generic_name");
        if (name.isEmpty()) return null;
        String grade = p.path("nutriscore_grade").asText("");
        return new ProductInfo(
                name,
                p.path("brands").asText("").split(",")[0].trim(),
                firstNonBlank(p, "image_url", "image_front_url"),
                firstNonBlank(p, "ingredients_text", "ingredients_text_el", "ingredients_text_en"),
                sourceName,
                HealthScore.isGrade(grade) ? grade.toLowerCase() : "",
                intOrNull(p.path("nova_group")),
                intOrNull(p.path("additives_n")));
    }

    // Free trial endpoint: no key, 100 lookups per day; has names but no ingredients
    private Mono<ProductInfo> upcItemDb(String barcode) {
        if (!barcode.matches("\\d{8,14}")) return Mono.empty();
        return source("UPCitemdb", barcode, "https://api.upcitemdb.com/prod/trial/lookup?upc=" + barcode,
                ProductLookupService::parseUpcItemDb);
    }

    private static ProductInfo parseUpcItemDb(JsonNode root) {
        JsonNode item = root.path("items").path(0);
        String name = item.path("title").asText("");
        if (name.isEmpty()) return null;
        return new ProductInfo(name, item.path("brand").asText(""), item.path("images").path(0).asText(""), "", "UPCitemdb");
    }

    // USDA FoodData Central branded foods (mostly US products); DEMO_KEY works with a low hourly limit
    private Mono<ProductInfo> usda(String barcode) {
        if (!barcode.matches("\\d{8,14}")) return Mono.empty();
        return source("USDA", barcode, "https://api.nal.usda.gov/fdc/v1/foods/search?dataType=Branded&pageSize=5&query="
                + barcode + "&api_key=" + usdaKey, root -> parseUsda(root, barcode));
    }

    private static ProductInfo parseUsda(JsonNode root, String barcode) {
        String wanted = stripLeadingZeros(barcode);
        for (JsonNode food : root.path("foods")) {
            if (!stripLeadingZeros(food.path("gtinUpc").asText("")).equals(wanted)) continue;
            String brand = food.path("brandName").asText(food.path("brandOwner").asText(""));
            return new ProductInfo(food.path("description").asText(""), brand, "", food.path("ingredients").asText(""), "USDA");
        }
        return null;
    }

    private JsonNode readJson(String body) {
        try {
            return mapper.readTree(body);
        } catch (Exception e) {
            throw new IllegalStateException("Reply is not JSON", e);
        }
    }

    private static Integer intOrNull(JsonNode node) {
        return node.canConvertToInt() || node.isTextual() && node.asText().matches("\\d+") ? node.asInt() : null;
    }

    private static String firstNonBlank(JsonNode node, String... fields) {
        for (String f : fields) {
            String v = node.path(f).asText("").trim();
            if (!v.isEmpty()) return v;
        }
        return "";
    }

    private static String stripLeadingZeros(String s) {
        return s.replaceFirst("^0+", "");
    }
}
