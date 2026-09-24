package com.ahmed.aiservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "yuding.ai")
@Getter
@Setter
public class AiProperties {
    private String primaryProvider = "gemini";
    private String primaryModel = "gemini-3.8-flash";
    private boolean fallbackEnabled = true;
    private String fallbackProvider = "groq";
    private String fallbackModel = "openai/gpt-oss-120b";
    private int requestTimeoutSeconds = 30;
    private int maxOutputTokens = 2048;

    private GeminiProperties gemini = new GeminiProperties();
    private GroqProperties groq = new GroqProperties();
    private RagProperties rag = new RagProperties();

    private AttachmentProperties attachments = new AttachmentProperties();

    @Getter
    @Setter
    public static class GeminiProperties {
        private String apiKey = "";
        private String baseUrl = "https://generativelanguage.googleapis.com";
    }

    @Getter
    @Setter
    public static class GroqProperties {
        private String apiKey = "";
        private String baseUrl = "https://api.groq.com/openai/v1";
    }

    @Getter
    @Setter
    public static class RagProperties {
        private boolean enabled = true;
        private String embeddingProvider = "gemini";
        private String embeddingModel = "gemini-embedding-001";
        private int embeddingDimension = 768;
        private double similarityThreshold = 0.35;
        private int topK = 4;
        private int maxContextTokens = 600;
        private boolean autoIngestOnStartup = true;
    }

    @Getter
    @Setter
    public static class AttachmentProperties {
        private String storageDir = ".data/attachments";
        private long maxFileSizeBytes = 10 * 1024 * 1024L;
        private int maxAttachmentsPerMessage = 4;
    }
}
