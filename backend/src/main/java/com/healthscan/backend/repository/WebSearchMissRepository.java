package com.healthscan.backend.repository;

import com.healthscan.backend.entity.WebSearchMiss;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebSearchMissRepository extends JpaRepository<WebSearchMiss, String> {
}
