package com.ahmed.aiservice.domain.rag.service;

import com.ahmed.aiservice.config.AiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class RagStartupRunner implements ApplicationRunner {

    private final AiProperties properties;
    private final RagIngestionService ingestionService;

    public RagStartupRunner(AiProperties properties, RagIngestionService ingestionService) {
        this.properties = properties;
        this.ingestionService = ingestionService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.getRag().isEnabled()) {
            log.info("RagStartupRunner: RAG is disabled. Skipping startup ingestion.");
            return;
        }

        if (properties.getRag().isAutoIngestOnStartup()) {
            log.info("RagStartupRunner: Triggering knowledge ingestion on application startup...");
            try {
                RagIngestionService.IngestionResult result = ingestionService.ingestAll();
                log.info("RagStartupRunner: Ingestion completed successfully: {}", result);
            } catch (Exception e) {
                log.error("RagStartupRunner: Failed to run startup knowledge ingestion: {}", e.getMessage(), e);
            }
        }
    }
}
