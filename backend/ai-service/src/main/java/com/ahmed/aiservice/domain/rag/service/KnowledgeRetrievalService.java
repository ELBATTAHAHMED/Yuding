package com.ahmed.aiservice.domain.rag.service;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.rag.model.RetrievedChunk;
import com.ahmed.aiservice.domain.rag.provider.EmbeddingProvider;
import com.ahmed.aiservice.domain.rag.repository.ChunkSearchResultProjection;
import com.ahmed.aiservice.domain.rag.repository.KnowledgeChunkRepository;
import com.ahmed.aiservice.domain.rag.util.VectorUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class KnowledgeRetrievalService {

    private final AiProperties properties;
    private final KnowledgeChunkRepository chunkRepository;
    private final EmbeddingProvider embeddingProvider;

    public KnowledgeRetrievalService(
            AiProperties properties,
            KnowledgeChunkRepository chunkRepository,
            @Qualifier("geminiEmbeddingProvider") EmbeddingProvider geminiProvider,
            @Qualifier("mockEmbeddingProvider") EmbeddingProvider mockProvider) {
        this.properties = properties;
        this.chunkRepository = chunkRepository;

        String configuredProvider = properties.getRag().getEmbeddingProvider();
        if ("mock".equalsIgnoreCase(configuredProvider) || properties.getGemini().getApiKey().isBlank()) {
            this.embeddingProvider = mockProvider;
        } else {
            this.embeddingProvider = geminiProvider;
        }
    }

    public List<RetrievedChunk> retrieve(String query, String category, Integer limit) {
        if (!properties.getRag().isEnabled() || query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        int topK = (limit != null && limit > 0) ? Math.min(limit, properties.getRag().getTopK()) : properties.getRag().getTopK();
        double maxDistance = properties.getRag().getSimilarityThreshold(); // e.g. 0.35

        try {
            // Generate query vector
            float[] queryVector = embeddingProvider.embed(query.trim());
            String pgVectorStr = VectorUtils.toPgVectorString(queryVector);

            String catParam = (category != null && !category.isBlank()) ? category.trim().toUpperCase() : null;

            List<ChunkSearchResultProjection> projections = chunkRepository.searchSimilarChunks(
                    pgVectorStr, catParam, maxDistance, topK
            );

            if (projections.isEmpty()) {
                log.info("KnowledgeRetrievalService: No chunks matched query='{}' category='{}' threshold={}",
                        query, catParam, maxDistance);
                return Collections.emptyList();
            }

            List<RetrievedChunk> results = new ArrayList<>();
            int totalChars = 0;
            int maxCharsBudget = properties.getRag().getMaxContextTokens() * 4; // ~2400 chars

            for (ChunkSearchResultProjection p : projections) {
                double distance = (p.getDistance() != null) ? p.getDistance() : 1.0;
                double similarity = Math.max(0.0, 1.0 - distance);

                String content = p.getContent() != null ? p.getContent().trim() : "";
                if (totalChars + content.length() > maxCharsBudget && !results.isEmpty()) {
                    break; // Keep within strict context budget
                }

                results.add(RetrievedChunk.builder()
                        .chunkId(p.getId())
                        .documentReference(p.getDocumentReference())
                        .title(p.getTitle())
                        .slug(p.getSlug())
                        .category(p.getCategory())
                        .sectionTitle(p.getSectionTitle())
                        .content(content)
                        .similarityScore(similarity)
                        .build());

                totalChars += content.length();
            }

            log.info("KnowledgeRetrievalService: Retrieved {} relevant chunks for query='{}' (category={})",
                    results.size(), query, catParam);
            return results;
        } catch (Exception e) {
            log.error("KnowledgeRetrievalService: Retrieval error: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }
}
