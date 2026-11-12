package com.healthscan.backend.repository;

import com.healthscan.backend.entity.Product;
import com.healthscan.backend.entity.ProductAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductAnalysisRepository extends JpaRepository<ProductAnalysis, Long> {

    Optional<ProductAnalysis> findByProductAndLang(Product product, String lang);

    /** False for a product saved before scores were calculated: its data is fetched again once. */
    boolean existsByProductAndScoreSourceIsNotNull(Product product);
}
