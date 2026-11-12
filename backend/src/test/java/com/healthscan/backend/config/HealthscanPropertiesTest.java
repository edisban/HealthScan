package com.healthscan.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

import static org.assertj.core.api.Assertions.assertThat;

class HealthscanPropertiesTest {

    @Configuration
    @EnableConfigurationProperties(HealthscanProperties.class)
    static class Config {}

    private final ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(Config.class);

    @Test
    void defaultsAreSafe() {
        runner.run(context -> {
            HealthscanProperties properties = context.getBean(HealthscanProperties.class);
            assertThat(properties.maxImageSize()).isEqualTo(DataSize.ofMegabytes(8));
            assertThat(properties.rateLimit().strictPerMinute()).isEqualTo(10);
            assertThat(properties.rateLimit().relaxedPerMinute()).isEqualTo(60);
            assertThat(properties.apiKey()).isEmpty();
            assertThat(properties.aiSharedSecret()).isEmpty();
            assertThat(properties.usdaApiKey()).isEqualTo("DEMO_KEY");
        });
    }

    @Test
    void bindsTheConfiguredValues() {
        runner.withPropertyValues(
                        "healthscan.max-image-size=2MB",
                        "healthscan.rate-limit.strict-per-minute=3",
                        "healthscan.api-key=k",
                        "healthscan.ai-service-url=http://ai-service:8000",
                        "healthscan.usda-api-key=my-key")
                .run(context -> {
                    HealthscanProperties properties = context.getBean(HealthscanProperties.class);
                    assertThat(properties.maxImageSize()).isEqualTo(DataSize.ofMegabytes(2));
                    assertThat(properties.rateLimit().strictPerMinute()).isEqualTo(3);
                    assertThat(properties.rateLimit().relaxedPerMinute()).isEqualTo(60);
                    assertThat(properties.apiKey()).isEqualTo("k");
                    assertThat(properties.aiServiceUrl()).isEqualTo("http://ai-service:8000");
                    assertThat(properties.usdaApiKey()).isEqualTo("my-key");
                });
    }
}
