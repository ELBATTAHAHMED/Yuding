package com.ahmed.aiservice.domain.service;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.provider.*;
import com.ahmed.aiservice.domain.provider.gemini.GeminiAiProvider;
import com.ahmed.aiservice.domain.provider.groq.GroqAiProvider;
import com.ahmed.aiservice.domain.tool.*;
import com.ahmed.aiservice.dto.AiChatRequest;
import com.ahmed.aiservice.dto.AiChatResponse;
import com.ahmed.aiservice.exception.AiProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AiChatService {

    public static final String SYSTEM_INSTRUCTION = """
            Vous êtes l'assistant de voyage officiel de Yuding (Yuding Assistant).
            Votre mission est d'accompagner, conseiller et guider les voyageurs avec précision et bienveillance.

            OUTILS DISPONIBLES ET RÈGLE D'ANCRAGE (GROUNDING) :
            1. Vous avez accès à des outils officiels en temps réel :
               - searchFlights : recherche de vols avec tarifs réels et horaires (accepte codes IATA ou noms de villes comme Casablanca, Paris).
               - searchHotels : recherche d'hôtels avec disponibilités et prix par nuit.
               - searchActivities : recherche d'activités touristiques et visites guidées.
               - searchTransfers : recherche de transferts privés et taxis.
               - getWeather : météo actuelle et prévisions météorologiques en direct.
               - convertCurrency : conversion officielle de devises en temps réel.
               - getBookingStatus : consultation du statut d'une réservation (nécessite d'être connecté).
            2. Dès que l'utilisateur pose une question relative à la météo, aux taux de change ou devises, aux vols, aux hôtels, aux activités, aux transferts ou au statut d'une réservation, VOUS DEVEZ OBLIGATOIREMENT ET SYSTÉMATIQUEMENT APPELER L'OUTIL CORRESPONDANT. Ne dites JAMAIS que vous n'avez pas accès aux données en temps réel ou que vous ne disposez pas d'informations en direct, car ces outils vous fournissent les données exactes du système Yuding.
            3. RÈGLE DE VÉRITÉ ABSOLUE : Fondez vos réponses STRICTEMENT sur les données retournées par les outils. Ne JAMAIS inventer de prix, de disponibilités, de compagnies aériennes ou de numéros de dossier. Si aucun résultat n'est trouvé, informez-en honnêtement le voyageur.
            4. STRICTEMENT EN LECTURE SEULE : Vous NE POUVEZ PAS créer de réservations, encaisser de paiements, modifier ou annuler des dossiers. Si le voyageur souhaite réserver ou payer, invitez-le chaleureusement à finaliser son achat en toute sécurité sur l'interface Yuding.
            5. TRAINS : Aucun outil train n'est actuellement disponible dans l'assistant ; orientez le voyageur vers l'onglet officiel Trains de Yuding.
            6. Répondez dans la langue utilisée par le voyageur (par défaut en français), avec clarté, courtoisie et professionnalisme.
            """;

    private final AiProperties properties;
    private final GeminiAiProvider geminiProvider;
    private final GroqAiProvider groqProvider;
    private final AiToolRegistry toolRegistry;
    private final AiToolExecutor toolExecutor;

    private final int maxToolRounds;
    private final int maxToolCallsPerRequest;

    public AiChatService(AiProperties properties,
                         GeminiAiProvider geminiProvider,
                         GroqAiProvider groqProvider) {
        this(properties, geminiProvider, groqProvider,
                new AiToolRegistry(Collections.emptyList()),
                new AiToolExecutor(new AiToolRegistry(Collections.emptyList()), new com.fasterxml.jackson.databind.ObjectMapper(), 12),
                3, 6);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AiChatService(AiProperties properties,
                         GeminiAiProvider geminiProvider,
                         GroqAiProvider groqProvider,
                         AiToolRegistry toolRegistry,
                         AiToolExecutor toolExecutor,
                         @Value("${yuding.ai.max-tool-rounds:3}") int maxToolRounds,
                         @Value("${yuding.ai.max-tool-calls-per-request:6}") int maxToolCallsPerRequest) {
        this.properties = properties;
        this.geminiProvider = geminiProvider;
        this.groqProvider = groqProvider;
        this.toolRegistry = toolRegistry;
        this.toolExecutor = toolExecutor;
        this.maxToolRounds = maxToolRounds;
        this.maxToolCallsPerRequest = maxToolCallsPerRequest;
    }

    public AiChatResponse processChat(AiChatRequest request) {
        return processChat(request, extractContextFromSecurityHolder());
    }

    public AiChatResponse processChat(AiChatRequest request, AiToolExecutionContext executionContext) {
        validateRequest(request);

        UUID conversationId = request.getConversationId();
        String userMessage = request.getMessage().trim();

        List<AiToolDefinition> toolDefinitions = toolRegistry.getDefinitions();
        Map<String, AiToolResult> requestCache = new ConcurrentHashMap<>();
        Set<String> uniqueToolsUsed = new LinkedHashSet<>();

        List<AiProviderMessage> messages = new ArrayList<>();
        messages.add(AiProviderMessage.user(userMessage));

        int round = 0;
        int totalToolCalls = 0;
        boolean fallbackUsed = false;
        String finalContent = "";
        AiProvider activeProvider = null;

        while (round < maxToolRounds) {
            // If we've reached our call limit, don't offer tools on subsequent turn
            List<AiToolDefinition> availableTools = (totalToolCalls >= maxToolCallsPerRequest)
                    ? Collections.emptyList()
                    : toolDefinitions;

            AiChatCommand command = AiChatCommand.builder()
                    .conversationId(conversationId)
                    .systemInstruction(SYSTEM_INSTRUCTION)
                    .userMessage(userMessage)
                    .messages(new ArrayList<>(messages))
                    .tools(availableTools)
                    .maxTokens(properties.getMaxOutputTokens())
                    .timeoutSeconds(properties.getRequestTimeoutSeconds())
                    .build();

            AiChatResult result;
            if (activeProvider != null) {
                result = activeProvider.chat(command);
            } else {
                result = executeWithProviderFallback(command, conversationId);
                if ("groq".equalsIgnoreCase(result.getProvider())) {
                    activeProvider = groqProvider;
                    fallbackUsed = true;
                } else {
                    activeProvider = geminiProvider;
                }
            }

            if (!result.hasToolCalls()) {
                finalContent = result.getContent();
                break;
            }

            // Model requested tool calls
            List<AiToolCall> requestedCalls = result.getToolCalls();
            int remainingCalls = maxToolCallsPerRequest - totalToolCalls;
            if (remainingCalls <= 0) {
                log.warn("AiChatService: Tool call limit reached ({}). Forcing final answer.", maxToolCallsPerRequest);
                break;
            }

            List<AiToolCall> allowedCalls = requestedCalls.stream().limit(remainingCalls).toList();
            totalToolCalls += allowedCalls.size();

            // Record assistant turn with tool calls
            messages.add(AiProviderMessage.assistantWithToolCalls(result.getContent(), allowedCalls));

            // Execute each tool call
            List<AiToolResult> toolResults = new ArrayList<>();
            for (AiToolCall call : allowedCalls) {
                AiToolResult toolResult = toolExecutor.execute(call, executionContext, requestCache);
                toolResults.add(toolResult);
                if (toolResult.isSuccess()) {
                    uniqueToolsUsed.add(call.getName());
                }
            }

            // Record tool responses in conversation
            messages.add(AiProviderMessage.toolResults(toolResults));
            round++;
        }

        // If loop finished due to round limit but no text returned yet, request final text without tools
        if (finalContent.isBlank() && !messages.isEmpty()) {
            AiChatCommand finalCommand = AiChatCommand.builder()
                    .conversationId(conversationId)
                    .systemInstruction(SYSTEM_INSTRUCTION)
                    .messages(new ArrayList<>(messages))
                    .tools(Collections.emptyList())
                    .maxTokens(properties.getMaxOutputTokens())
                    .timeoutSeconds(properties.getRequestTimeoutSeconds())
                    .build();

            AiChatResult finalResult = (activeProvider != null)
                    ? activeProvider.chat(finalCommand)
                    : executeWithProviderFallback(finalCommand, conversationId);
            finalContent = finalResult.getContent();
        }

        log.info("AiChatService: Completed chat: conv=[{}] rounds=[{}] toolsCalled=[{}] toolsUsed={} fallback=[{}]",
                conversationId, round, totalToolCalls, uniqueToolsUsed, fallbackUsed);

        boolean grounded = !uniqueToolsUsed.isEmpty();
        return AiChatResponse.grounded(conversationId, finalContent, new ArrayList<>(uniqueToolsUsed));
    }

    private AiChatResult executeWithProviderFallback(AiChatCommand command, UUID conversationId) {
        try {
            return geminiProvider.chat(command);
        } catch (AiProviderException ex) {
            if (shouldTriggerFallback(ex)) {
                log.warn("AiChatService: Primary provider [gemini] failed transiently ({}). Triggering fallback to [groq] for conversation [{}]",
                        ex.getErrorCode(), conversationId);
                try {
                    return groqProvider.chat(command);
                } catch (Exception fallbackEx) {
                    log.error("AiChatService: Fallback provider [groq] also failed for conversation [{}]", conversationId);
                    throw fallbackEx;
                }
            } else {
                log.warn("AiChatService: Primary provider error is non-retryable ({}). Fallback skipped.", ex.getErrorCode());
                throw ex;
            }
        }
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
            throw new AiProviderException("Request body must not be null", "AI_INVALID_REQUEST", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getConversationId() == null) {
            throw new AiProviderException("conversationId is mandatory", "AI_INVALID_REQUEST", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getMessage() == null || request.getMessage().trim().isBlank()) {
            throw new AiProviderException("message must not be blank", "AI_INVALID_REQUEST", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getMessage().length() > 8000) {
            throw new AiProviderException("message exceeds maximum allowed length of 8000 characters", "AI_MESSAGE_TOO_LONG", false, HttpStatus.BAD_REQUEST);
        }
    }

    private AiToolExecutionContext extractContextFromSecurityHolder() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            String token = jwtAuth.getToken().getTokenValue();
            String userId = jwtAuth.getToken().getSubject();
            Set<String> roles = jwtAuth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.toSet());
            return new AiToolExecutionContext(token, userId, roles);
        }
        return AiToolExecutionContext.anonymous();
    }
}
