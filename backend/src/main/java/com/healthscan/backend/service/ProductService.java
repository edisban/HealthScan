package com.healthscan.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthscan.backend.dto.AiAnalyzeRequest;
import com.healthscan.backend.dto.AiAnalyzeResponse;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.entity.Product;
import com.healthscan.backend.entity.WebSearchMiss;
import com.healthscan.backend.repository.ProductRepository;
import com.healthscan.backend.repository.WebSearchMissRepository;
import com.healthscan.backend.service.ProductLookupService.ProductInfo;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.client.reactive.ClientHttpRequest;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserter;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Service
public class ProductService {

    // How long a failed web search is remembered before the barcode may be searched again
    private static final Duration WEB_SEARCH_RETRY_AFTER = Duration.ofDays(1);
    private static final Duration AI_CALL_TIMEOUT = Duration.ofSeconds(60);

    private final ProductRepository repo;
    private final WebSearchMissRepository missRepo;
    private final ProductLookupService lookupService;
    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();

    /** @param aiWebClient the client from {@code AiClientConfig}: AI service base URL plus its shared secret */
    public ProductService(ProductRepository repo, WebSearchMissRepository missRepo, ProductLookupService lookupService,
                          WebClient aiWebClient) {
        this.repo = repo;
        this.missRepo = missRepo;
        this.lookupService = lookupService;
        this.webClient = aiWebClient;
    }

    public ProductResponse analyzeProduct(String barcode, String lang) {
        Product cached = repo.findByBarcode(barcode).orElse(null);
        // Re-analyze products cached without a score (e.g. AI service was down last time) or in another language
        if (cached != null && cached.getHealthScore() != null && lang.equals(cached.getLang())) {
            return toResponse(cached);
        }

        ProductInfo info = lookupService.lookup(barcode);
        // Label photo and web search products are in no database; re-analyze them from the cached row
        if (info == null && cached != null) {
            info = new ProductInfo(cached.getName(), "", cached.getImageUrl(), cached.getIngredientsText(), cached.getSource());
        }
        // Not in any database; don't cache, so a later scan, label photo or web search can still fill it in
        return info == null ? notFound(barcode) : saveAndAnalyze(cached, barcode, info, lang);
    }

    /** Identifies an unknown product from a photo of its label, then scores it like any other product. */
    public ProductResponse analyzeLabel(String barcode, byte[] imageBytes, String lang) {
        byte[] bytes = imageBytes != null ? imageBytes : new byte[0];
        ByteArrayResource image = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return "label.jpg";
            }
        };
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", image);
        JsonNode identity = callAi("/read-label", BodyInserters.fromMultipartData(form));
        return fromIdentity(barcode, identity, "Label photo", lang);
    }

    /** Asks the AI service to find the barcode on the web; the app calls this after every database misses. */
    public ProductResponse searchWeb(String barcode, String lang) {
        // Never replace a known product with a web match
        if (repo.findByBarcode(barcode).isPresent()) return analyzeProduct(barcode, lang);
        if (searchedRecently(barcode)) return notFound(barcode);

        JsonNode identity = callAi("/search-product", BodyInserters.fromValue(new SearchRequest(barcode)));
        // Only a real "no match" is remembered; null means the AI service failed, so a retry may still work
        if (identity != null && !identity.path("found").asBoolean(false)) rememberMiss(barcode);
        return fromIdentity(barcode, identity, "Web search", lang);
    }

    private boolean searchedRecently(String barcode) {
        Objects.requireNonNull(barcode);
        Instant cutoff = Instant.now().minus(WEB_SEARCH_RETRY_AFTER);
        return missRepo.findById(barcode).filter(miss -> miss.getSearchedAt().isAfter(cutoff)).isPresent();
    }

    private void rememberMiss(String barcode) {
        try {
            missRepo.save(new WebSearchMiss(barcode, Instant.now()));
        } catch (DataIntegrityViolationException duplicate) {
            // A concurrent search recorded the same miss first
        }
    }

    private ProductResponse fromIdentity(String barcode, JsonNode identity, String source, String lang) {
        if (identity == null || !identity.path("found").asBoolean(false)) return notFound(barcode);
        ProductInfo info = new ProductInfo(
                identity.path("productName").asText(""),
                identity.path("brand").asText(""),
                "",
                identity.path("ingredients").asText(""),
                source);
        Product cached = repo.findByBarcode(barcode).orElse(null);
        return saveAndAnalyze(cached, barcode, info, lang);
    }

    private record SearchRequest(String barcode) {}

    private JsonNode callAi(String path, @NonNull BodyInserter<?, ? super ClientHttpRequest> body) {
        try {
            return webClient.post().uri(path).body(body)
                    .retrieve().bodyToMono(JsonNode.class).block(AI_CALL_TIMEOUT);
        } catch (Exception e) {
            return null;
        }
    }

    private static ProductResponse notFound(String barcode) {
        ProductResponse res = new ProductResponse(barcode, "", "", "", null, "");
        res.setFound(false);
        return res;
    }

    private ProductResponse saveAndAnalyze(Product cached, String barcode, ProductInfo info, String lang) {
        Product product = cached != null ? cached : new Product();
        product.setBarcode(barcode);
        product.setName(info.name());
        product.setImageUrl(info.imageUrl());
        product.setIngredientsText(info.ingredients());
        product.setSource(info.source());
        String aiName = info.brand().isEmpty() || info.name().toLowerCase().contains(info.brand().toLowerCase())
                ? info.name()
                : info.brand() + " " + info.name();
        analyzeWithAi(product, aiName, lang);
        try {
            repo.save(product);
        } catch (DataIntegrityViolationException duplicate) {
            // A concurrent request for the same barcode saved it first; our analysis is still valid
        }
        return toResponse(product);
    }

    /** Fills score, summary and details from the AI service; leaves them empty if it is unavailable. */
    private void analyzeWithAi(Product product, String name, String lang) {
        String ingredients = product.getIngredientsText() == null ? "" : product.getIngredientsText();
        List<String> ingredientList = ingredients.isEmpty() ? List.of() : Arrays.asList(ingredients.split(","));
        try {
            AiAnalyzeRequest aiReq = new AiAnalyzeRequest(product.getBarcode(), name, ingredientList, lang);
            AiAnalyzeResponse aiRes = webClient.post()
                    .uri("/analyze")
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

    private ProductResponse toResponse(Product product) {
        ProductResponse res = new ProductResponse(
                product.getBarcode(), product.getName(), product.getImageUrl(),
                product.getIngredientsText(), product.getHealthScore(), product.getExplanation(),
                product.getName(),
                product.getOrigin() != null ? product.getOrigin() : "",
                readList(product.getIngredientsJson()),
                product.getNutrition() != null ? product.getNutrition() : "",
                readList(product.getProsJson()),
                readList(product.getConsJson()));
        res.setSource(product.getSource() != null ? product.getSource() : "");
        return res;
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
