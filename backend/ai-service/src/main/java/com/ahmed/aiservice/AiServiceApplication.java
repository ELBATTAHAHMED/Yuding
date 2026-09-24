package com.ahmed.aiservice;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
public class AiServiceApplication {

    private static final Logger log = LoggerFactory.getLogger(AiServiceApplication.class);

    public static void main(String[] args) {
        loadLocalEnvIfPresent();
        SpringApplication.run(AiServiceApplication.class, args);
    }

    private static void loadLocalEnvIfPresent() {
        List<Path> candidates = List.of(
                Path.of(".env.local"),
                Path.of("backend/ai-service/.env.local"),
                Path.of("../.env.local")
        );

        for (Path path : candidates) {
            if (Files.exists(path)) {
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
                            if (!key.isEmpty()) {
                                System.setProperty(key, val);
                                // Map uppercase environment variable names to Spring properties
                                switch (key) {
                                    case "GEMINI_API_KEY" -> System.setProperty("yuding.ai.gemini.api-key", val);
                                    case "GROQ_API_KEY" -> System.setProperty("yuding.ai.groq.api-key", val);
                                    case "AI_PRIMARY_PROVIDER" -> System.setProperty("yuding.ai.primary-provider", val);
                                    case "AI_PRIMARY_MODEL" -> System.setProperty("yuding.ai.primary-model", val);
                                    case "AI_FALLBACK_ENABLED" -> System.setProperty("yuding.ai.fallback-enabled", val);
                                    case "AI_FALLBACK_PROVIDER" -> System.setProperty("yuding.ai.fallback-provider", val);
                                    case "AI_FALLBACK_MODEL" -> System.setProperty("yuding.ai.fallback-model", val);
                                    case "GEMINI_BASE_URL" -> System.setProperty("yuding.ai.gemini.base-url", val);
                                    case "GROQ_BASE_URL" -> System.setProperty("yuding.ai.groq.base-url", val);
                                    case "AI_REQUEST_TIMEOUT_SECONDS" -> System.setProperty("yuding.ai.request-timeout-seconds", val);
                                    case "AI_MAX_OUTPUT_TOKENS" -> System.setProperty("yuding.ai.max-output-tokens", val);
                                    case "AI_EMBEDDING_PROVIDER" -> System.setProperty("yuding.ai.rag.embedding-provider", val);
                                    case "AI_EMBEDDING_MODEL" -> System.setProperty("yuding.ai.rag.embedding-model", val);
                                    case "AI_EMBEDDING_DIMENSION" -> System.setProperty("yuding.ai.rag.embedding-dimension", val);
                                    case "AI_RAG_ENABLED" -> System.setProperty("yuding.ai.rag.enabled", val);
                                    default -> {}
                                }
                            }
                        }
                    }
                    log.info("AiServiceApplication: Successfully loaded environment variables from local file [{}]", path);
                    break;
                } catch (Exception ignored) {
                    // Fail-safe: continue startup if file cannot be read
                }
            }
        }

        // Diagnostic output: boolean configuration only, NEVER printing key values, prefixes, suffixes, or lengths
        boolean geminiConfigured = isConfigured("yuding.ai.gemini.api-key", "GEMINI_API_KEY");
        boolean groqConfigured = isConfigured("yuding.ai.groq.api-key", "GROQ_API_KEY");
        String primaryProvider = System.getProperty("yuding.ai.primary-provider", System.getenv().getOrDefault("AI_PRIMARY_PROVIDER", "gemini"));
        log.info("AiServiceApplication: Provider status: primary=[{}] geminiConfigured=[{}] groqFallbackConfigured=[{}]",
                primaryProvider, geminiConfigured, groqConfigured);
    }

    private static boolean isConfigured(String propertyName, String envName) {
        String val = System.getProperty(propertyName);
        if (val == null || val.isBlank()) {
            val = System.getenv(envName);
        }
        return val != null && !val.isBlank();
    }
}
