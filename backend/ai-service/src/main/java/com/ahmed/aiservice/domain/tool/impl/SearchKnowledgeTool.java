package com.ahmed.aiservice.domain.tool.impl;

import com.ahmed.aiservice.domain.rag.model.RetrievedChunk;
import com.ahmed.aiservice.domain.rag.service.KnowledgeRetrievalService;
import com.ahmed.aiservice.domain.tool.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

@Slf4j
@Component
public class SearchKnowledgeTool implements AiTool {

    private final KnowledgeRetrievalService retrievalService;
    private final AiToolDefinition definition;

    public SearchKnowledgeTool(KnowledgeRetrievalService retrievalService) {
        this.retrievalService = retrievalService;
        this.definition = new AiToolDefinition(
                "searchKnowledge",
                "Recherche des informations fiables et officielles dans la base de connaissances Yuding (FAQ de la plateforme, conditions de réservation et modalités de paiement, politique d'annulation et de remboursement, guides de voyage Marrakech/Paris, et centre d'assistance client). N'UTILISEZ PAS cet outil pour obtenir des tarifs de vols actuels, disponibilités d'hôtels en temps réel, météo du jour ou taux de change actuels.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "query", Map.of(
                                        "type", "string",
                                        "description", "Termes de recherche sémantique (ex: 'politique annulation', 'statut paid', 'climat marrakech', 'moyens de contact support')"
                                ),
                                "category", Map.of(
                                        "type", "string",
                                        "description", "Catégorie optionnelle pour filtrer la recherche : 'FAQ', 'YUDING_POLICY', 'CANCELLATION_POLICY', 'DESTINATION_INFO', 'SUPPORT', 'TRAVEL_GUIDE'"
                                )
                        ),
                        "required", List.of("query")
                )
        );
    }

    @Override
    public AiToolDefinition getDefinition() {
        return definition;
    }

    @Override
    public AiToolResult execute(AiToolCall call, AiToolExecutionContext context) {
        String callId = call.getId();
        Map<String, Object> args = call.getArguments();

        String query = getString(args, "query");
        String category = getString(args, "category");

        if (query == null || query.trim().length() < 2) {
            return AiToolResult.error(callId, "searchKnowledge", "Le paramètre 'query' est obligatoire et doit comporter au moins 2 caractères.");
        }

        try {
            List<RetrievedChunk> chunks = retrievalService.retrieve(query, category, 4);

            if (chunks.isEmpty()) {
                Map<String, Object> emptyResult = new LinkedHashMap<>();
                emptyResult.put("status", "NOT_FOUND");
                emptyResult.put("count", 0);
                emptyResult.put("message", "Aucune information officielle Yuding trouvée pour ces critères de recherche.");
                emptyResult.put("items", Collections.emptyList());
                return AiToolResult.success(callId, "searchKnowledge", emptyResult);
            }

            List<Map<String, Object>> items = new ArrayList<>();
            for (RetrievedChunk chunk : chunks) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("documentReference", chunk.getDocumentReference());
                item.put("title", chunk.getTitle());
                item.put("sectionTitle", chunk.getSectionTitle());
                item.put("category", chunk.getCategory());
                item.put("content", chunk.getContent());
                items.add(item);
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("status", "SUCCESS");
            result.put("count", items.size());
            result.put("query", query);
            if (category != null && !category.isBlank()) {
                result.put("category", category);
            }
            result.put("items", items);

            return AiToolResult.success(callId, "searchKnowledge", result);
        } catch (Exception e) {
            log.error("SearchKnowledgeTool failed for query '{}': {}", query, e.getMessage(), e);
            return AiToolResult.error(callId, "searchKnowledge", "Erreur lors de la recherche documentaire: " + e.getMessage());
        }
    }

    private String getString(Map<String, Object> args, String key) {
        if (args == null) return null;
        Object val = args.get(key);
        return val != null ? val.toString() : null;
    }
}
