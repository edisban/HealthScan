package com.healthscan.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import com.healthscan.backend.config.HealthscanProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(HealthscanProperties.class)
public class HealthScanBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(HealthScanBackendApplication.class, args);
    }
}
