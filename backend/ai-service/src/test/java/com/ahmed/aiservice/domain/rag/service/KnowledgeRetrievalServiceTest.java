package com.ahmed.aiservice.domain.rag.service;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.rag.model.RetrievedChunk;
import com.ahmed.aiservice.domain.rag.provider.mock.MockEmbeddingProvider;
import com.ahmed.aiservice.domain.rag.repository.ChunkSearchResultProjection;
import com.ahmed.aiservice.domain.rag.repository.KnowledgeChunkRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KnowledgeRetrievalServiceTest {

    @Mock
    private KnowledgeChunkRepository chunkRepository;

    private KnowledgeRetrievalService retrievalService;

    @BeforeEach
    void setUp() {
        AiProperties properties = new AiProperties();
        properties.getRag().setEnabled(true);
        properties.getRag().setTopK(4);
        properties.getRag().setSimilarityThreshold(0.35);

        MockEmbeddingProvider mockProvider = new MockEmbeddingProvider(768);
        retrievalService = new KnowledgeRetrievalService(properties, chunkRepository, mockProvider, mockProvider);
    }

    @Test
    @DisplayName("retrieve returns empty list when query is blank or rag disabled")
    void retrieve_blankQuery() {
        assertThat(retrievalService.retrieve("", null, 5)).isEmpty();
        assertThat(retrievalService.retrieve(null, null, 5)).isEmpty();
    }

    @Test
    @DisplayName("retrieve converts projections to RetrievedChunks")
    void retrieve_success() {
        UUID chunkId = UUID.randomUUID();
        ChunkSearchResultProjection proj = new ChunkSearchResultProjection() {
            @Override public UUID getId() { return chunkId; }
            @Override public String getDocumentReference() { return "DOC-FAQ-001"; }
            @Override public String getTitle() { return "FAQ Yuding"; }
            @Override public String getSlug() { return "faq-yuding"; }
            @Override public String getCategory() { return "FAQ"; }
            @Override public String getSectionTitle() { return "Général"; }
            @Override public String getContent() { return "Contenu FAQ Yuding"; }
            @Override public Double getDistance() { return 0.20; }
        };

        when(chunkRepository.searchSimilarChunks(anyString(), any(), anyDouble(), anyInt()))
                .thenReturn(List.of(proj));

        List<RetrievedChunk> results = retrievalService.retrieve("qu'est-ce que Yuding", null, 4);

        assertThat(results).hasSize(1);
        RetrievedChunk rc = results.get(0);
        assertThat(rc.getDocumentReference()).isEqualTo("DOC-FAQ-001");
        assertThat(rc.getTitle()).isEqualTo("FAQ Yuding");
        assertThat(rc.getSimilarityScore()).isCloseTo(0.80, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    @DisplayName("retrieve returns empty when repository returns no matches")
    void retrieve_noMatches() {
        when(chunkRepository.searchSimilarChunks(anyString(), any(), anyDouble(), anyInt()))
                .thenReturn(Collections.emptyList());

        List<RetrievedChunk> results = retrievalService.retrieve("inconnu", null, 4);
        assertThat(results).isEmpty();
    }
}
