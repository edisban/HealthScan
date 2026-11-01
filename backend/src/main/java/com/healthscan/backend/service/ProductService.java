package com.healthscan.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthscan.backend.dto.AiAnalyzeRequest;
import com.healthscan.backend.dto.AiAnalyzeResponse;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.entity.Product;
import com.healthscan.backend.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Arrays;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository repo;
    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();

    public ProductService(ProductRepository repo) {
        this.repo = repo;
        this.webClient = WebClient.builder().build();
    }

    public ProductResponse analyzeProduct(String barcode, String lang) {
        Product cached = repo.findByBarcode(barcode).orElse(null);
        Product product = cached;
        // Re-analyze products cached without a score (e.g. AI service was down last time) or in another language
        if (product == null || product.getHealthScore() == null || !lang.equals(product.getLang())) {
            try {
                // Fetch from Open Food Facts, fallback to Open Products Facts
                String url = "https://world.openfoodfacts.org/api/v2/product/" + barcode + ".json";
                String body = webClient.get().uri(url).retrieve().bodyToMono(String.class).block();
                JsonNode root = mapper.readTree(body);
                JsonNode p = root.path("product");
                if (p.isMissingNode() || p.path("product_name").asText("").isEmpty()) {
                    url = "https://world.openproductsfacts.org/api/v2/product/" + barcode + ".json";
                    body = webClient.get().uri(url).retrieve().bodyToMono(String.class).block();
                    root = mapper.readTree(body);
                    p = root.path("product");
                }
                product = cached != null ? cached : new Product();
                product.setBarcode(barcode);
                product.setName(p.path("product_name").asText("Unknown"));
                product.setImageUrl(p.path("image_url").asText(""));
                String ingredients = p.path("ingredients_text").asText("");
                product.setIngredientsText(ingredients);

                List<String> ingredientList = ingredients.isEmpty()
                        ? List.of()
                        : Arrays.asList(ingredients.split(","));

                // Forward to AI service (with no ingredient list the AI judges by product name)
                boolean knownProduct = !product.getName().isBlank() && !"Unknown".equals(product.getName());
                if (!ingredientList.isEmpty() || knownProduct) {
                    try {
                        AiAnalyzeRequest aiReq = new AiAnalyzeRequest(barcode, product.getName(), ingredientList, lang);
                        String envUrl = System.getenv("AI_SERVICE_URL");
                        String aiUrl = (envUrl == null || envUrl.isBlank())
                                ? "http://localhost:8000/analyze"
                                : envUrl + "/analyze";
                        AiAnalyzeResponse aiRes = webClient.post()
                                .uri(aiUrl)
                                .bodyValue(aiReq)
                                .retrieve()
                                .bodyToMono(AiAnalyzeResponse.class)
                                .block();
                        if (aiRes != null) {
                            product.setHealthScore(aiRes.getHealthScore());
                            product.setExplanation(aiRes.getSummary());
                            product.setLang(lang);
                            product.setOrigin(aiRes.getOrigin());
                            product.setNutrition(aiRes.getNutrition());
                            product.setIngredientsJson(mapper.writeValueAsString(aiRes.getIngredients()));
                            product.setProsJson(mapper.writeValueAsString(aiRes.getPros()));
                            product.setConsJson(mapper.writeValueAsString(aiRes.getCons()));
                        }
                    } catch (Exception ignored) {
                        // AI service unavailable; keep defaults
                    }
                }
                repo.save(product);
            } catch (Exception e) {
                // Lookup failed (network error or barcode not found); don't cache, so the next scan retries
                ProductResponse fallback = new ProductResponse(barcode, "Unknown Product", "", "", null,
                        "el".equals(lang) ? "Δεν ήταν δυνατή η ανάλυση." : "Could not analyze this product.");
                return fallback;
            }
        }
        return new ProductResponse(
                product.getBarcode(), product.getName(), product.getImageUrl(),
                product.getIngredientsText(), product.getHealthScore(), product.getExplanation(),
                product.getName(),
                product.getOrigin() != null ? product.getOrigin() : "",
                readList(product.getIngredientsJson()),
                product.getNutrition() != null ? product.getNutrition() : "",
                readList(product.getProsJson()),
                readList(product.getConsJson()));
    }

    private List<String> readList(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return Arrays.asList(mapper.readValue(json, String[].class));
        } catch (Exception e) {
            return null;
        }
    }
}


