package com.healthscan.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.unit.DataSize;

import java.util.List;

/** All app settings under {@code healthscan.*}, bound once and injected where needed. */
@ConfigurationProperties(prefix = "healthscan")
public record HealthscanProperties(
        @DefaultValue("8MB") DataSize maxImageSize,
        @DefaultValue RateLimit rateLimit,
        // Empty disables the X-Api-Key check
        @DefaultValue("") String apiKey,
        @DefaultValue("http://localhost:8000") String aiServiceUrl,
        // Sent to the AI service in X-Internal-Secret; empty sends nothing
        @DefaultValue("") String aiSharedSecret,
        // Origins of the web app allowed to call /api/** from a browser; empty turns CORS off
        @DefaultValue List<String> corsAllowedOrigins,
        // USDA FoodData Central key for the last product lookup; DEMO_KEY has a low hourly limit
        @DefaultValue("DEMO_KEY") String usdaApiKey) {

    /** Requests per minute per client IP; "strict" covers the endpoints that call Groq. */
    public record RateLimit(@DefaultValue("10") int strictPerMinute,
                            @DefaultValue("60") int relaxedPerMinute) {}
}
