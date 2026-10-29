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
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

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
        Product product = repo.findByBarcode(barcode).orElse(null);
        if (product == null) {
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
                product = new Product();
                product.setBarcode(barcode);
                product.setName(p.path("product_name").asText("Unknown"));
                product.setImageUrl(p.path("image_url").asText(""));
                String ingredients = p.path("ingredients_text").asText("");
                product.setIngredientsText(ingredients);

                List<String> ingredientList = ingredients.isEmpty()
                        ? List.of()
                        : Arrays.asList(ingredients.split(","));

                AiAnalyzeResponse aiRes = null;
                // Forward to AI service (skip if no ingredients)
                if (!ingredientList.isEmpty()) {
                    try {
                        AiAnalyzeRequest aiReq = new AiAnalyzeRequest(barcode, product.getName(), ingredientList, lang);
                        aiRes = webClient.post()
                                .uri(System.getenv().getOrDefault("AI_SERVICE_URL", "http://localhost:8000/analyze"))
                                .bodyValue(aiReq)
                                .retrieve()
                                .bodyToMono(AiAnalyzeResponse.class)
                                .block();
                        if (aiRes != null) {
                            product.setHealthScore(aiRes.getHealthScore());
                            product.setExplanation(aiRes.getSummary());
                        }
                    } catch (Exception ignored) {
                        // AI service unavailable; keep defaults
                    }
                }
                repo.save(product);
            } catch (Exception e) {
                product = new Product();
                product.setBarcode(barcode);
                product.setName("Unknown Product");
                product.setHealthScore(50);
                product.setExplanation("Δεν ήταν δυνατή η ανάλυση.");
                repo.save(product);
            }
        }
        return new ProductResponse(
                product.getBarcode(), product.getName(), product.getImageUrl(),
                product.getIngredientsText(), product.getHealthScore(), product.getExplanation(),
                aiRes != null ? aiRes.getProductName() : product.getName(),
                aiRes != null ? aiRes.getOrigin() : "",
                aiRes != null ? aiRes.getIngredients() : null,
                aiRes != null ? aiRes.getNutrition() : "");
    }
}


