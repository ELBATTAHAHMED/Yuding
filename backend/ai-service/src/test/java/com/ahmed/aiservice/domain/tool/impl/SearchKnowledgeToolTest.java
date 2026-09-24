package com.ahmed.aiservice.domain.tool.impl;

import com.ahmed.aiservice.domain.rag.model.RetrievedChunk;
import com.ahmed.aiservice.domain.rag.service.KnowledgeRetrievalService;
import com.ahmed.aiservice.domain.tool.AiToolCall;
import com.ahmed.aiservice.domain.tool.AiToolResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchKnowledgeToolTest {

    @Mock
    private KnowledgeRetrievalService retrievalService;

    private SearchKnowledgeTool tool;

    @BeforeEach
    void setUp() {
        tool = new SearchKnowledgeTool(retrievalService);
    }

    @Test
    @DisplayName("Definition has correct name and required query parameter")
    void getDefinition_valid() {
        assertThat(tool.getDefinition().getName()).isEqualTo("searchKnowledge");
        assertThat(tool.getDefinition().getDescription()).contains("base de connaissances");
    }

    @Test
    @DisplayName("execute rejects missing or short query")
    void execute_invalidQuery() {
        AiToolCall call = new AiToolCall("call-1", "searchKnowledge", Map.of("query", "a"));
        AiToolResult result = tool.execute(call, null);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("au moins 2 caractères");
    }

    @Test
    @DisplayName("execute returns formatted chunks when knowledge found")
    void execute_found() {
        RetrievedChunk chunk = RetrievedChunk.builder()
                .chunkId(UUID.randomUUID())
                .documentReference("DOC-CAN-001")
                .title("Politique d'Annulation")
                .sectionTitle("Conditions")
                .category("CANCELLATION_POLICY")
                .content("Annulation sans frais 48h avant.")
                .similarityScore(0.85)
                .build();

        when(retrievalService.retrieve(any(), any(), anyInt())).thenReturn(List.of(chunk));

        AiToolCall call = new AiToolCall("call-2", "searchKnowledge", Map.of("query", "annulation", "category", "CANCELLATION_POLICY"));
        AiToolResult result = tool.execute(call, null);

        assertThat(result.isSuccess()).isTrue();
        Map<?, ?> data = (Map<?, ?>) result.getData();
        assertThat(data.get("status")).isEqualTo("SUCCESS");
        assertThat(data.get("count")).isEqualTo(1);
        List<?> items = (List<?>) data.get("items");
        assertThat(items).hasSize(1);
        Map<?, ?> item = (Map<?, ?>) items.get(0);
        assertThat(item.get("documentReference")).isEqualTo("DOC-CAN-001");
        assertThat(item.get("title")).isEqualTo("Politique d'Annulation");
        assertThat(item.get("content")).isEqualTo("Annulation sans frais 48h avant.");
    }

    @Test
    @DisplayName("execute returns NOT_FOUND when no relevant chunks found")
    void execute_notFound() {
        when(retrievalService.retrieve(any(), any(), anyInt())).thenReturn(Collections.emptyList());

        AiToolCall call = new AiToolCall("call-3", "searchKnowledge", Map.of("query", "recette couscous"));
        AiToolResult result = tool.execute(call, null);

        assertThat(result.isSuccess()).isTrue();
        Map<?, ?> data = (Map<?, ?>) result.getData();
        assertThat(data.get("status")).isEqualTo("NOT_FOUND");
        assertThat(data.get("count")).isEqualTo(0);
    }
}
