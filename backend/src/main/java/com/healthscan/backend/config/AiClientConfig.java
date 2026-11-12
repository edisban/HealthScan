package com.healthscan.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/** The one HTTP client for the AI service: its base URL and the shared secret it expects. */
@Configuration
public class AiClientConfig {

    public static final String SECRET_HEADER = "X-Internal-Secret";

    @Bean
    public WebClient aiWebClient(WebClient.Builder builder,
                                 @Value("${healthscan.ai-service-url:http://localhost:8000}") String url,
                                 @Value("${healthscan.ai-shared-secret:}") String secret) {
        return build(builder.clone(), url, secret);
    }

    static WebClient build(WebClient.Builder builder, String url, String secret) {
        builder.baseUrl(url);
        if (secret != null && !secret.isBlank()) {
            builder.defaultHeader(SECRET_HEADER, secret);
        }
        return builder.build();
    }
}
