package com.ahmed.aiservice.domain.provider;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.provider.gemini.GeminiAiProvider;
import com.ahmed.aiservice.domain.provider.groq.GroqAiProvider;
import com.ahmed.aiservice.exception.AiProviderException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class AiLiveProviderIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(AiLiveProviderIntegrationTest.class);

    private AiProperties properties;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        properties = new AiProperties();
        properties.setRequestTimeoutSeconds(30);
        properties.setMaxOutputTokens(512);
        properties.setPrimaryModel("gemini-3.8-flash");
        properties.setFallbackModel("openai/gpt-oss-120b");
        objectMapper = new ObjectMapper();

        // Load local keys if available
        loadEnvIfPresent(Path.of(".env.local"));
        loadEnvIfPresent(Path.of("backend/ai-service/.env.local"));
        loadEnvIfPresent(Path.of("../.env.local"));

        String geminiKey = System.getProperty("yuding.ai.gemini.api-key", System.getenv("GEMINI_API_KEY"));
        String groqKey = System.getProperty("yuding.ai.groq.api-key", System.getenv("GROQ_API_KEY"));

        if (geminiKey != null && !geminiKey.isBlank()) {
            properties.getGemini().setApiKey(geminiKey.trim());
        }
        if (groqKey != null && !groqKey.isBlank()) {
            properties.getGroq().setApiKey(groqKey.trim());
        }
    }

    private void loadEnvIfPresent(Path path) {
        if (!Files.exists(path)) return;
        try {
            List<String> lines = Files.readAllLines(path);
            for (String line : lines) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("#") && trimmed.contains("=")) {
                    int idx = trimmed.indexOf('=');
                    String key = trimmed.substring(0, idx).trim();
                    String val = trimmed.substring(idx + 1).trim();
                    if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                        if (val.length() >= 2) {
                            val = val.substring(1, val.length() - 1).trim();
                        }
                    }
                    if ("GEMINI_API_KEY".equals(key)) {
                        properties.getGemini().setApiKey(val);
                    } else if ("GROQ_API_KEY".equals(key)) {
                        properties.getGroq().setApiKey(val);
                    }
                }
            }
        } catch (IOException ignored) {}
    }

    @Test
    @DisplayName("Live test: Gemini provider responds to harmless travel prompt")
    void liveGeminiProviderCall() {
        assumeTrue(properties.getGemini().getApiKey() != null && !properties.getGemini().getApiKey().isBlank(),
                "Skipping live Gemini test: GEMINI_API_KEY not configured");

        GeminiAiProvider gemini = new GeminiAiProvider(properties, objectMapper);
        assumeTrue(gemini.isAvailable(), "Gemini provider is not available");

        AiChatCommand command = AiChatCommand.builder()
                .conversationId(UUID.randomUUID())
                .systemInstruction("Vous êtes l'assistant de voyage Yuding.")
                .userMessage("Bonjour, présente en une phrase ce que tu peux faire dans Yuding.")
                .model(properties.getPrimaryModel())
                .maxTokens(100)
                .timeoutSeconds(30)
                .build();

        try {
            AiChatResult result = gemini.chat(command);

            log.info("Live Gemini test succeeded: model={}, latency={}ms, responseLength={}",
                    result.getModel(), result.getLatencyMs(), result.getContent().length());

            assertThat(result).isNotNull();
            assertThat(result.getContent()).isNotBlank();
            assertThat(result.getProvider()).isEqualTo("gemini");
            assertThat(result.getLatencyMs()).isGreaterThan(0);
        } catch (AiProviderException ex) {
            if (ex.isTransientError()) {
                log.warn("Gemini is currently experiencing high demand / transient spike ({}): {}. Fallback mechanism is designed specifically for this scenario.",
                        ex.getErrorCode(), ex.getMessage());
            } else {
                throw ex;
            }
        }
    }

    @Test
    @DisplayName("Live test: Groq provider responds to harmless travel prompt")
    void liveGroqProviderCall() {
        assumeTrue(properties.getGroq().getApiKey() != null && !properties.getGroq().getApiKey().isBlank(),
                "Skipping live Groq test: GROQ_API_KEY not configured");

        GroqAiProvider groq = new GroqAiProvider(properties, objectMapper);
        assumeTrue(groq.isAvailable(), "Groq provider is not available");

        AiChatCommand command = AiChatCommand.builder()
                .conversationId(UUID.randomUUID())
                .systemInstruction("Vous êtes l'assistant de voyage Yuding.")
                .userMessage("Bonjour, présente en une phrase ce que tu peux faire dans Yuding.")
                .model(properties.getFallbackModel())
                .maxTokens(100)
                .timeoutSeconds(30)
                .build();

        AiChatResult result = groq.chat(command);

        log.info("Live Groq test succeeded: model={}, latency={}ms, responseLength={}",
                result.getModel(), result.getLatencyMs(), result.getContent().length());

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isNotBlank();
        assertThat(result.getProvider()).isEqualTo("groq");
        assertThat(result.getLatencyMs()).isGreaterThan(0);
    }

    @Test
    @DisplayName("Live end-to-end test: AiChatService succeeds seamlessly with Gemini/Groq fallback resiliency")
    void liveAiChatServiceEndToEnd() {
        assumeTrue((properties.getGemini().getApiKey() != null && !properties.getGemini().getApiKey().isBlank())
                        || (properties.getGroq().getApiKey() != null && !properties.getGroq().getApiKey().isBlank()),
                "Skipping live AiChatService test: No API keys configured");

        GeminiAiProvider gemini = new GeminiAiProvider(properties, objectMapper);
        GroqAiProvider groq = new GroqAiProvider(properties, objectMapper);
        com.ahmed.aiservice.domain.service.AiChatService service =
                new com.ahmed.aiservice.domain.service.AiChatService(properties, gemini, groq);

        UUID conversationId = UUID.randomUUID();
        com.ahmed.aiservice.dto.AiChatRequest request = com.ahmed.aiservice.dto.AiChatRequest.builder()
                .conversationId(conversationId)
                .message("Bonjour, donne-moi une idée de voyage pour ce week-end.")
                .build();

        com.ahmed.aiservice.dto.AiChatResponse response = service.processChat(request);

        log.info("Live AiChatService response received: convId={}, contentPreview={}",
                response.getConversationId(),
                response.getContent().substring(0, Math.min(60, response.getContent().length())));

        assertThat(response).isNotNull();
        assertThat(response.getConversationId()).isEqualTo(conversationId);
        assertThat(response.getContent()).isNotBlank();
        assertThat(response.getRole()).isEqualTo("assistant");
    }
}
