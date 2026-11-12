package com.healthscan.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/** The one HTTP client for the AI service: its base URL and the shared secret it expects. */
@Configuration
public class AiClientConfig {

    public static final String SECRET_HEADER = "X-Internal-Secret";
    // Every call to the AI service gives up after this long; model calls usually take seconds
    public static final Duration TIMEOUT = Duration.ofSeconds(60);

    @Bean
    public WebClient aiWebClient(WebClient.Builder builder, HealthscanProperties properties) {
        return build(builder.clone(), properties.aiServiceUrl(), properties.aiSharedSecret());
    }

    static WebClient build(WebClient.Builder builder, String url, String secret) {
        builder.baseUrl(url);
        if (secret != null && !secret.isBlank()) {
            builder.defaultHeader(SECRET_HEADER, secret);
        }
        return builder.build();
    }
}
