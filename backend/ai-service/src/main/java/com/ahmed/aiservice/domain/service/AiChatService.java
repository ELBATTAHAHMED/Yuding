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
            Votre mission est d'accompagner, conseiller et guider les voyageurs avec une rigueur absolue, précision et bienveillance.

            OUTILS DISPONIBLES ET RÈGLE D'ANCRAGE (GROUNDING) :
            1. Vous avez accès à 7 outils officiels Yuding en temps réel :
               - searchFlights : vols réels (accepte codes IATA ou noms de villes comme Casablanca, Paris).
               - searchHotels : hôtels réels avec disponibilités et tarifs.
               - searchActivities : activités touristiques et visites guidées.
               - searchTransfers : transferts privés et taxis.
               - getWeather : météo actuelle et prévisions météorologiques.
               - convertCurrency : conversion officielle de devises au taux officiel.
               - getBookingStatus : consultation du statut d'une réservation (authentification requise).

            2. APPEL SYSTÉMATIQUE DES OUTILS :
               Dès que la question porte sur un fait courant (météo, devises, vols, hôtels, activités, transferts, statut de réservation), VOUS DEVEZ OBLIGATOIREMENT APPELER L'OUTIL CORRESPONDANT. Ne dites jamais que vous n'avez pas accès aux données en temps réel.

            3. POLITIQUE STRICTE DE PROVENANCE FACTUELLE (AUCUNE INVENTION DE FAITS COURANTS) :
               - TOUTE affirmation factuelle courante (prix, tarifs, devises, disponibilités, horaires, météo, véhicules, catégories, prestataires ou statut de dossier) DOIT STRICTEMENT ET EXCLUSIVEMENT PROVENIR des données renvoyées par l'outil.
               - GARDE DES NOMBRES ET TARIFS : Tout nombre ou montant actuel (prix en EUR/MAD, température en °C, humidité, vent en km/h, taux de change) doit provenir du résultat de l'outil ou d'un calcul arithmétique direct à partir de celui-ci (ex: montant × taux de change). Il est FORMELLEMENT INTERDIT d'inventer des tarifs externes ou approximatifs (ex: INTERDIT de mentionner "taxi officiel ≈ 70 MAD / ≈ 6 €", "forfait 20 €", etc.).
               - PAS D'INVENTAIRE INVENTÉ : Si l'outil ne liste pas expressément des types de véhicules (ex: vans, limousines, berlines, minibus) ou des catégories spécifiques, NE PRÉTENDEZ PAS qu'ils sont disponibles chez Yuding.
               - PAS DE CAPACITÉS SERVICE CLIENT IMAGINAIRES : Ne prétendez jamais que le service client Yuding peut vérifier des partenaires cachés ou non affichés. Invitez simplement l'utilisateur à modifier ses critères de recherche (dates, horaires, destination).
               - RÉSULTATS VIDES (0 OFFRE) : Si un outil renvoie 0 résultat, informez sobrement l'utilisateur qu'aucune offre Yuding n'a été trouvée pour ces critères ("Aucune offre trouvée pour ces critères"). Ne tentez JAMAIS de compenser l'absence de résultat par des estimations issues de votre mémoire.

            4. RÈGLES DE STATUT RÉSERVATION (PAID vs CONFIRMED) :
               - Si le statut renvoyé est "PAID" : vous devez impérativement indiquer que le PAIEMENT EST VALIDÉ, mais que la réservation est EN ATTENTE DE CONFIRMATION PAR LE FOURNISSEUR. Le statut PAID n'est PAS identique à CONFIRMED.
               - Si le dossier est introuvable ou non autorisé (403/404) : indiquez avec courtoisie que le dossier est introuvable ou non accessible, sans divulguer aucune information personnelle (anti-IDOR).

            5. BUDGETS ET DATES DE VOL :
               - Si un utilisateur demande un vol avec un budget (ex: "à 50 EUR") sans préciser de date, demandez-lui sa date de départ au lieu de chercher ou d'inventer une date arbitraire.
               - Si une recherche de vol ne retourne aucun vol ou aucun prix, ne proposez pas de conversion de devises inutile.

            6. STRICTEMENT EN LECTURE SEULE :
               Vous ne pouvez ni créer, ni modifier, ni payer, ni annuler de réservation. Invitez le voyageur à effectuer ses démarches sur l'interface sécurisée Yuding.

            7. Répondez dans la langue utilisée par le voyageur (par défaut en français), avec clarté, concision et professionnalisme.
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
                new AiToolExecutor(new AiToolRegistry(Collections.emptyList()), new com.fasterxml.jackson.databind.ObjectMapper(), 25),
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
                    fallbackUsed = !"groq".equalsIgnoreCase(properties.getPrimaryProvider());
                } else {
                    activeProvider = geminiProvider;
                    fallbackUsed = !"gemini".equalsIgnoreCase(properties.getPrimaryProvider());
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
            String finalInstruction = SYSTEM_INSTRUCTION + "\n\nSYNTHÈSE FINALE OBLIGATOIRE : Rédigez maintenant directement votre réponse finale en texte clair et bienveillant pour l'utilisateur, à partir des données exactes reçues ci-dessus. N'appelez plus aucun outil.";
            AiChatCommand finalCommand = AiChatCommand.builder()
                    .conversationId(conversationId)
                    .systemInstruction(finalInstruction)
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
        AiProvider primary = "groq".equalsIgnoreCase(properties.getPrimaryProvider()) ? groqProvider : geminiProvider;
        AiProvider fallback = (primary == groqProvider) ? geminiProvider : groqProvider;
        String primaryName = (primary != null && primary.getProviderType() != null) ? primary.getProviderType().name().toLowerCase() : "primary";
        String fallbackName = (fallback != null && fallback.getProviderType() != null) ? fallback.getProviderType().name().toLowerCase() : "fallback";

        try {
            return primary.chat(command);
        } catch (AiProviderException ex) {
            if (shouldTriggerFallback(ex, fallback)) {
                log.warn("AiChatService: Primary provider [{}] failed transiently ({}). Triggering fallback to [{}] for conversation [{}]",
                        primaryName, ex.getErrorCode(), fallbackName, conversationId);
                try {
                    return fallback.chat(command);
                } catch (Exception fallbackEx) {
                    log.error("AiChatService: Fallback provider [{}] also failed for conversation [{}]", fallbackName, conversationId);
                    throw fallbackEx;
                }
            } else {
                log.warn("AiChatService: Primary provider [{}] error is non-retryable ({}). Fallback skipped.", primaryName, ex.getErrorCode());
                throw ex;
            }
        }
    }

    private boolean shouldTriggerFallback(AiProviderException ex, AiProvider fallback) {
        if (!properties.isFallbackEnabled()) {
            return false;
        }
        if (!ex.isRetryable()) {
            return false;
        }
        return fallback != null && fallback.isAvailable();
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
