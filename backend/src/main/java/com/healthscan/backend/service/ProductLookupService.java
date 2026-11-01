package com.healthscan.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.function.Supplier;

/**
 * Looks a barcode up in several free product databases, in order, and returns the first hit.
 */
@Service
public class ProductLookupService {

    public record ProductInfo(String name, String brand, String imageUrl, String ingredients, String source) {}

    // Only request the fields we use; full Open Facts records can be hundreds of KB
    private static final String OPEN_FACTS_FIELDS = String.join(",",
            "product_name", "product_name_el", "product_name_en", "generic_name", "brands",
            "image_url", "image_front_url", "ingredients_text", "ingredients_text_el", "ingredients_text_en");
    private static final Duration TIMEOUT = Duration.ofSeconds(8);

    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();
    private final String usdaKey;

    public ProductLookupService() {
        this.webClient = WebClient.builder()
                // Open Food Facts asks API users to identify their app
                .defaultHeader("User-Agent", "HealthScan/1.0")
                .codecs(c -> c.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();
        String key = System.getenv("USDA_API_KEY");
        this.usdaKey = (key == null || key.isBlank()) ? "DEMO_KEY" : key;
    }

    /** Returns the product from the first database that knows the barcode, or null if none does. */
    public ProductInfo lookup(String barcode) {
        List<Supplier<ProductInfo>> sources = List.of(
                () -> openFacts("https://world.openfoodfacts.org", "Open Food Facts", barcode),
                () -> openFacts("https://world.openbeautyfacts.org", "Open Beauty Facts", barcode),
                () -> openFacts("https://world.openproductsfacts.org", "Open Products Facts", barcode),
                () -> upcItemDb(barcode),
                () -> usda(barcode));
        for (Supplier<ProductInfo> source : sources) {
            try {
                ProductInfo info = source.get();
                if (info != null) return info;
            } catch (Exception ignored) {
                // Not found (404), rate limited or unreachable: try the next database
            }
        }
        return null;
    }

    private ProductInfo openFacts(String baseUrl, String sourceName, String barcode) {
        JsonNode root = getJson(baseUrl + "/api/v2/product/" + barcode + ".json?fields=" + OPEN_FACTS_FIELDS);
        JsonNode p = root.path("product");
        if (root.path("status").asInt(0) != 1 || p.isMissingNode()) return null;
        String name = firstNonBlank(p, "product_name", "product_name_el", "product_name_en", "generic_name");
        if (name.isEmpty()) return null;
        return new ProductInfo(
                name,
                p.path("brands").asText("").split(",")[0].trim(),
                firstNonBlank(p, "image_url", "image_front_url"),
                firstNonBlank(p, "ingredients_text", "ingredients_text_el", "ingredients_text_en"),
                sourceName);
    }

    // Free trial endpoint: no key, 100 lookups per day; has names but no ingredients
    private ProductInfo upcItemDb(String barcode) {
        if (!barcode.matches("\\d{8,14}")) return null;
        JsonNode item = getJson("https://api.upcitemdb.com/prod/trial/lookup?upc=" + barcode).path("items").path(0);
        String name = item.path("title").asText("");
        if (name.isEmpty()) return null;
        return new ProductInfo(name, item.path("brand").asText(""), item.path("images").path(0).asText(""), "", "UPCitemdb");
    }

    // USDA FoodData Central branded foods (mostly US products); DEMO_KEY works with a low hourly limit
    private ProductInfo usda(String barcode) {
        if (!barcode.matches("\\d{8,14}")) return null;
        JsonNode foods = getJson("https://api.nal.usda.gov/fdc/v1/foods/search?dataType=Branded&pageSize=5&query="
                + barcode + "&api_key=" + usdaKey).path("foods");
        String wanted = stripLeadingZeros(barcode);
        for (JsonNode food : foods) {
            if (!stripLeadingZeros(food.path("gtinUpc").asText("")).equals(wanted)) continue;
            String brand = food.path("brandName").asText(food.path("brandOwner").asText(""));
            return new ProductInfo(food.path("description").asText(""), brand, "", food.path("ingredients").asText(""), "USDA");
        }
        return null;
    }

    private JsonNode getJson(@NonNull String url) {
        try {
            String body = webClient.get().uri(url).retrieve().bodyToMono(String.class).block(TIMEOUT);
            return mapper.readTree(body == null ? "{}" : body);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
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
