package com.ahmed.aiservice.domain.service;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.provider.AiChatCommand;
import com.ahmed.aiservice.domain.provider.AiChatResult;
import com.ahmed.aiservice.domain.provider.gemini.GeminiAiProvider;
import com.ahmed.aiservice.domain.provider.groq.GroqAiProvider;
import com.ahmed.aiservice.dto.AiChatRequest;
import com.ahmed.aiservice.dto.AiChatResponse;
import com.ahmed.aiservice.exception.AiProviderException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

    public static final String SYSTEM_INSTRUCTION = """
            Vous êtes l'assistant de voyage officiel de Yuding (Yuding Assistant).
            Votre mission est de conseiller et guider les voyageurs : recommandations de destinations, idées d'itinéraires, conseils culturels et pratiques.
            
            DIRECTIVES IMPORTANTES :
            1. Répondez dans la langue utilisée par le voyageur (par défaut en français).
            2. Soyez concis, accueillant, précis et bienveillant.
            3. RÈGLE DE VÉRITÉ ABSOLUE : Vous n'avez pas accès aux disponibilités en direct, aux tarifs en temps réel des prestataires, ni à l'état des réservations ou des comptes.
            4. Vous ne devez JAMAIS inventer de prix en direct, de disponibilités de chambres ou de vols, ni de numéros de dossier ou de confirmation.
            5. Vous ne pouvez en aucun cas effectuer de réservation, de modification, d'annulation ou de paiement.
            6. Pour réserver ou consulter les tarifs en temps réel, invitez toujours le voyageur à utiliser les fonctionnalités de recherche officielles de Yuding (Vols, Hôtels, Activités, Trains, Transferts).
            """;

    private final AiProperties properties;
    private final GeminiAiProvider geminiProvider;
    private final GroqAiProvider groqProvider;

    public AiChatResponse processChat(AiChatRequest request) {
        validateRequest(request);

        UUID conversationId = request.getConversationId();
        String userMessage = request.getMessage().trim();

        AiChatCommand command = AiChatCommand.builder()
                .conversationId(conversationId)
                .systemInstruction(SYSTEM_INSTRUCTION)
                .userMessage(userMessage)
                .maxTokens(properties.getMaxOutputTokens())
                .timeoutSeconds(properties.getRequestTimeoutSeconds())
                .build();

        AiChatResult result;
        boolean fallbackUsed = false;

        try {
            // Attempt primary provider (Gemini)
            result = geminiProvider.chat(command);

        } catch (AiProviderException ex) {
            // Check if fallback is eligible and configured
            if (shouldTriggerFallback(ex)) {
                log.warn("AiChatService: Primary provider [gemini] failed transiently ({}). Triggering fallback to [groq] for conversation [{}]",
                        ex.getErrorCode(), conversationId);
                try {
                    result = groqProvider.chat(command);
                    fallbackUsed = true;
                } catch (Exception fallbackEx) {
                    log.error("AiChatService: Fallback provider [groq] also failed for conversation [{}]", conversationId);
                    throw fallbackEx;
                }
            } else {
                log.warn("AiChatService: Primary provider error is non-retryable ({}). Fallback skipped.", ex.getErrorCode());
                throw ex;
            }
        }

        // Safe observability logging (Never log user message content or API keys)
        log.info("AiChatService: Handled chat message: conv=[{}] provider=[{}] model=[{}] latency=[{}ms] fallback=[{}] promptTokens=[{}] completionTokens=[{}]",
                conversationId,
                result.getProvider(),
                result.getModel(),
                result.getLatencyMs(),
                fallbackUsed,
                result.getPromptTokens() != null ? result.getPromptTokens() : "N/A",
                result.getCompletionTokens() != null ? result.getCompletionTokens() : "N/A"
        );

        return AiChatResponse.of(conversationId, result.getContent());
    }

    private boolean shouldTriggerFallback(AiProviderException ex) {
        if (!properties.isFallbackEnabled()) {
            return false;
        }
        if (!ex.isRetryable()) {
            return false;
        }
        return groqProvider.isAvailable();
    }

    private void validateRequest(AiChatRequest request) {
        if (request == null) {
            throw new AiProviderException("Request body cannot be null", "AI_INVALID_REQUEST", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getConversationId() == null) {
            throw new AiProviderException("conversationId is required", "AI_INVALID_REQUEST", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getMessage() == null || request.getMessage().trim().isBlank()) {
            throw new AiProviderException("message must not be blank", "AI_INVALID_REQUEST", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getMessage().length() > 8000) {
            throw new AiProviderException("message exceeds maximum length of 8000 characters", "AI_MESSAGE_TOO_LONG", false, HttpStatus.BAD_REQUEST);
        }
    }
}
