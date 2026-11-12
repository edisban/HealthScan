package com.healthscan.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Objects;

/** CORS for the web version of the app. Off unless healthscan.cors-allowed-origins lists origins. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final HealthscanProperties properties;

    public WebConfig(HealthscanProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        if (properties.corsAllowedOrigins().isEmpty()) return;
        String[] origins = properties.corsAllowedOrigins().toArray(String[]::new);
        Objects.requireNonNull(origins);
        registry.addMapping("/api/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST")
                .allowedHeaders("Content-Type", "X-Api-Key")
                // So the web app can read how long to wait after a 429
                .exposedHeaders("Retry-After");
    }
}
