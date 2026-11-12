package com.healthscan.backend.web;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.healthscan.backend.config.HealthscanProperties;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Per-IP rate limiting with Bucket4j. The endpoints that call Groq get a strict limit,
 * the product lookup a relaxed one; over the limit the answer is 429 with Retry-After.
 */
@Component
@Order(1)
public class RateLimitFilter extends OncePerRequestFilter {

    enum Tier { STRICT, RELAXED }

    private static final Pattern PRODUCT = Pattern.compile("^/api/v1/product/[^/]+$");
    private static final Pattern PRODUCT_AI = Pattern.compile("^/api/v1/product/[^/]+/(label|web-search)$");
    private static final Set<String> IMAGE = Set.of("/api/v1/analyze-image", "/api/v1/analyze-image-base64");
    // Oldest clients are forgotten first, so memory stays bounded
    private static final int MAX_TRACKED_CLIENTS = 10_000;

    private final int strictPerMinute;
    private final int relaxedPerMinute;
    private final Map<String, Bucket> buckets = Collections.synchronizedMap(
            new LinkedHashMap<>(256, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
                    return size() > MAX_TRACKED_CLIENTS;
                }
            });

    public RateLimitFilter(HealthscanProperties properties) {
        this.strictPerMinute = properties.rateLimit().strictPerMinute();
        this.relaxedPerMinute = properties.rateLimit().relaxedPerMinute();
    }

    static Tier tierOf(String method, String path) {
        if ("POST".equals(method) && (IMAGE.contains(path) || PRODUCT_AI.matcher(path).matches())) return Tier.STRICT;
        if ("GET".equals(method) && PRODUCT.matcher(path).matches()) return Tier.RELAXED;
        return null;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        Tier tier = tierOf(request.getMethod(), request.getRequestURI());
        if (tier == null) {
            chain.doFilter(request, response);
            return;
        }
        // remoteAddr is the direct peer; behind a reverse proxy this needs the proxy's forwarded address instead
        Bucket bucket = buckets.computeIfAbsent(tier + "|" + request.getRemoteAddr(), key -> newBucket(tier));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", Long.toString(probe.getRemainingTokens()));
            chain.doFilter(request, response);
            return;
        }
        long retryAfterSeconds = Math.max(1, (probe.getNanosToWaitForRefill() + 999_999_999L) / 1_000_000_000L);
        response.setHeader("Retry-After", Long.toString(retryAfterSeconds));
        ProblemResponses.write(response, HttpStatus.TOO_MANY_REQUESTS, "Rate limit exceeded, try again later");
    }

    private Bucket newBucket(Tier tier) {
        int perMinute = tier == Tier.STRICT ? strictPerMinute : relaxedPerMinute;
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(perMinute).refillGreedy(perMinute, Duration.ofMinutes(1)))
                .build();
    }
}
