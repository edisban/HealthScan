package com.healthscan.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthscan.backend.config.AiClientConfig;
import com.healthscan.backend.dto.AiAnalyzeRequest;
import com.healthscan.backend.dto.AiAnalyzeResponse;
import com.healthscan.backend.dto.ProductResponse;
import com.healthscan.backend.entity.Product;
import com.healthscan.backend.entity.ProductAnalysis;
import com.healthscan.backend.entity.WebSearchMiss;
import com.healthscan.backend.repository.ProductAnalysisRepository;
import com.healthscan.backend.repository.ProductRepository;
import com.healthscan.backend.repository.WebSearchMissRepository;
import com.healthscan.backend.service.ProductLookupService.ProductInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.List;
import java.util.Objects;

@Service
public class ProductService {

    // How long a failed web search is remembered before the barcode may be searched again
    private static final Duration WEB_SEARCH_RETRY_AFTER = Duration.ofDays(1);
    // Sources of products that are in no database
    static final String LABEL_PHOTO = "Label photo";
    static final String WEB_SEARCH = "Web search";
    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository repo;
    private final ProductAnalysisRepository analysisRepo;
    private final WebSearchMissRepository missRepo;
    private final ProductLookupService lookupService;
    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();

    /** @param aiWebClient the client from {@code AiClientConfig}: AI service base URL plus its shared secret */
    public ProductService(ProductRepository repo, ProductAnalysisRepository analysisRepo, WebSearchMissRepository missRepo,
                          ProductLookupService lookupService, WebClient aiWebClient) {
        this.repo = repo;
        this.analysisRepo = analysisRepo;
        this.missRepo = missRepo;
        this.lookupService = lookupService;
        this.webClient = aiWebClient;
    }

    public ProductResponse analyzeProduct(String barcode, String lang) {
        Product product = repo.findByBarcode(barcode).orElse(null);
        ProductAnalysis analysis = null;
        if (product != null) {
            analysis = analysisRepo.findByProductAndLang(product, lang).orElse(null);
            if (isComplete(analysis)) return toResponse(product, analysis);
            // Known product, only this language is missing: ask the AI, not the five databases
            if (!needsLookup(product)) return analyze(product, "", lang, analysis);
        }

        ProductInfo info = lookupService.lookup(barcode);
        if (info == null) {
            // Not in any database; don't cache, so a later scan, label photo or web search can still fill it in
            return product == null ? notFound(barcode) : analyze(product, "", lang, analysis);
        }
        Product saved = saveProduct(fill(product != null ? product : new Product(), barcode, info));
        return analyze(saved, info.brand(), lang, analysis);
    }

    /** Identifies an unknown product from a photo of its label, then scores it like any other product. */
    public ProductResponse analyzeLabel(String barcode, byte[] imageBytes, String lang) {
        // A label photo only fills in unknown barcodes; it never replaces a product everyone else sees
        if (repo.findByBarcode(barcode).isPresent()) return analyzeProduct(barcode, lang);
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
        return fromIdentity(barcode, identity, LABEL_PHOTO, lang);
    }

    /** Asks the AI service to find the barcode on the web; the app calls this after every database misses. */
    public ProductResponse searchWeb(String barcode, String lang) {
        // Never replace a known product with a web match
        if (repo.findByBarcode(barcode).isPresent()) return analyzeProduct(barcode, lang);
        if (searchedRecently(barcode)) return notFound(barcode);

        JsonNode identity = callAi("/search-product", BodyInserters.fromValue(new SearchRequest(barcode)));
        // Only a real "no match" is remembered; null means the AI service failed, so a retry may still work
        if (identity != null && !identity.path("found").asBoolean(false)) rememberMiss(barcode);
        return fromIdentity(barcode, identity, WEB_SEARCH, lang);
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
            log.debug("Web search miss for {} was already recorded", barcode);
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
        Product product = saveProduct(fill(new Product(), barcode, info));
        return analyze(product, info.brand(), lang, null);
    }

    private record SearchRequest(String barcode) {}

    private JsonNode callAi(@NonNull String path, @NonNull BodyInserter<?, ? super ClientHttpRequest> body) {
        try {
            return webClient.post().uri(path).body(body)
                    .retrieve().bodyToMono(JsonNode.class).block(AiClientConfig.TIMEOUT);
        } catch (Exception e) {
            log.warn("AI service call {} failed: {}", path, e.toString());
            return null;
        }
    }

    private static ProductResponse notFound(String barcode) {
        return ProductResponse.notFound(barcode);
    }

    private static boolean isComplete(ProductAnalysis analysis) {
        return analysis != null && analysis.getHealthScore() != null && analysis.getScoreSource() != null;
    }

    /**
     * Label photo and web search products are in no database, so only the AI is asked again. A database product
     * is looked up again only if it was saved before scores were calculated from Nutri-Score (no score source yet).
     */
    private boolean needsLookup(Product product) {
        boolean fromDatabase = !LABEL_PHOTO.equals(product.getSource()) && !WEB_SEARCH.equals(product.getSource());
        return fromDatabase && !analysisRepo.existsByProductAndScoreSourceIsNotNull(product);
    }

    private static @NonNull Product fill(@NonNull Product product, String barcode, ProductInfo info) {
        product.setBarcode(barcode);
        product.setName(info.name());
        product.setImageUrl(info.imageUrl());
        product.setIngredientsText(info.ingredients());
        product.setSource(info.source());
        product.setNutriScore(info.nutriScore());
        product.setNovaGroup(info.novaGroup());
        product.setAdditivesCount(info.additives());
        return product;
    }

    /** Saved before the AI call, so the product data stays even when the AI service is down. */
    private Product saveProduct(@NonNull Product product) {
        try {
            return repo.save(product);
        } catch (DataIntegrityViolationException e) {
            // Usually a concurrent request saved the same barcode first; carry on with that row.
            // It can also be a value over a column limit, so log it rather than hide it.
            log.warn("Could not save product {}: {}", product.getBarcode(), e.getMostSpecificCause().getMessage());
            return repo.findByBarcode(product.getBarcode()).orElse(product);
        }
    }

    /** Scores the product in one language; the analysis is stored only if the AI answered, so a failure is retried. */
    private ProductResponse analyze(Product product, String brand, String lang, ProductAnalysis existing) {
        ProductAnalysis analysis = existing != null ? existing : new ProductAnalysis(product, lang);
        String name = text(product.getName());
        String aiName = brand == null || brand.isEmpty() || name.toLowerCase().contains(brand.toLowerCase())
                ? name
                : brand + " " + name;
        Integer fixedScore = HealthScore.fromOpenFoodFacts(
                product.getNutriScore(), product.getNovaGroup(), product.getAdditivesCount());
        boolean answered = analyzeWithAi(product, analysis, aiName, lang, fixedScore);
        if (fixedScore != null) {
            // The calculated score always wins, even if the AI returned another number or was down
            analysis.setHealthScore(fixedScore);
            analysis.setScoreSource(HealthScore.NUTRI_SCORE);
        } else {
            analysis.setScoreSource(analysis.getHealthScore() != null ? HealthScore.AI_ESTIMATE : null);
        }
        if (answered && product.getId() != null) {
            analysis.setAnalyzedAt(Instant.now());
            try {
                analysisRepo.save(analysis);
            } catch (DataIntegrityViolationException e) {
                // A concurrent request stored this language first; our analysis is still valid for this reply
                log.warn("Could not save the {} analysis of {}: {}", lang, product.getBarcode(),
                        e.getMostSpecificCause().getMessage());
            }
        }
        return toResponse(product, analysis);
    }

    /** Fills score, summary and details from the AI service; returns false if it is unavailable. */
    private boolean analyzeWithAi(Product product, ProductAnalysis analysis, String name, String lang,
                                  Integer fixedScore) {
        // Sent as written: splitting on commas would break ingredients such as "salt (sea salt, iodine)"
        String ingredients = text(product.getIngredientsText());
        try {
            AiAnalyzeRequest aiReq = new AiAnalyzeRequest(product.getBarcode(), name, ingredients, lang, fixedScore,
                    HealthScore.describe(product.getNutriScore(), product.getNovaGroup(), product.getAdditivesCount()));
            AiAnalyzeResponse aiRes = webClient.post()
                    .uri("/analyze")
                    .bodyValue(aiReq)
                    .retrieve()
                    .bodyToMono(AiAnalyzeResponse.class)
                    .block(AiClientConfig.TIMEOUT);
            if (aiRes == null) return false;
            analysis.setHealthScore(aiRes.healthScore());
            analysis.setExplanation(aiRes.summary());
            analysis.setOrigin(aiRes.origin());
            analysis.setNutrition(aiRes.nutrition());
            analysis.setIngredientsJson(mapper.writeValueAsString(aiRes.ingredients()));
            analysis.setProsJson(mapper.writeValueAsString(aiRes.pros()));
            analysis.setConsJson(mapper.writeValueAsString(aiRes.cons()));
            return true;
        } catch (Exception e) {
            // AI service unavailable; nothing is stored for this language, so the next scan tries again
            log.warn("Scoring failed for {}: {}", product.getBarcode(), e.toString());
            return false;
        }
    }

    private ProductResponse toResponse(Product product, ProductAnalysis analysis) {
        return new ProductResponse(
                product.getBarcode(),
                true,
                text(product.getName()),
                text(product.getImageUrl()),
                text(product.getSource()),
                analysis.getHealthScore(),
                text(analysis.getScoreSource()),
                text(product.getNutriScore()),
                product.getNovaGroup(),
                text(analysis.getExplanation()),
                text(analysis.getOrigin()),
                text(analysis.getNutrition()),
                readList(analysis.getIngredientsJson()),
                readList(analysis.getProsJson()),
                readList(analysis.getConsJson()));
    }

    private static String text(String value) {
        return value == null ? "" : value;
    }

    private List<String> readList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return List.of(mapper.readValue(json, String[].class));
        } catch (Exception e) {
            log.warn("Stored list is not a JSON array: {}", e.toString());
            return List.of();
        }
    }
}
