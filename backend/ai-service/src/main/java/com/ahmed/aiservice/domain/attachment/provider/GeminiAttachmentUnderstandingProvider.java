package com.ahmed.aiservice.domain.attachment.provider;

import com.ahmed.aiservice.config.AiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.*;

@Component
@Slf4j
@ConditionalOnProperty(name = "yuding.ai.attachments.multimodal-provider", havingValue = "gemini", matchIfMissing = true)
public class GeminiAttachmentUnderstandingProvider implements AttachmentUnderstandingProvider {

    private final AiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiAttachmentUnderstandingProvider(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(15));
        requestFactory.setReadTimeout(Duration.ofSeconds(30));

        this.restClient = RestClient.builder()
                .baseUrl(properties.getGemini().getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public boolean isAvailable() {
        String key = properties.getGemini().getApiKey();
        return key != null && !key.isBlank();
    }

    @Override
    public String analyzeImage(byte[] imageBytes, String mimeType, String contextPrompt) {
        if (!isAvailable()) {
            log.info("Gemini API key is not configured; using fallback image representation");
            return "[Image fournie par l'utilisateur (format: " + mimeType + ", taille: " + (imageBytes != null ? imageBytes.length : 0) + " octets)]";
        }

        try {
            String base64Data = Base64.getEncoder().encodeToString(imageBytes);
            String model = (properties.getPrimaryModel() != null && properties.getPrimaryModel().contains("gemini"))
                    ? properties.getPrimaryModel()
                    : "gemini-flash-lite-latest";

            String prompt = (contextPrompt != null && !contextPrompt.isBlank())
                    ? "Décris de manière factuelle et détaillée les éléments visuels de cette image pour un contexte de voyage. " + contextPrompt
                    : "Décris de manière factuelle et concise le contenu de cette image (destination, lieu, activités, type d'hébergement, texte visible, prix ou informations de voyage affichées).";

            Map<String, Object> inlineData = Map.of(
                    "mime_type", mimeType,
                    "data", base64Data
            );

            Map<String, Object> imagePart = Map.of("inline_data", inlineData);
            Map<String, Object> textPart = Map.of("text", prompt);

            Map<String, Object> contentNode = Map.of(
                    "role", "user",
                    "parts", List.of(imagePart, textPart)
            );

            Map<String, Object> payload = Map.of(
                    "contents", List.of(contentNode),
                    "generationConfig", Map.of(
                            "maxOutputTokens", 512,
                            "temperature", 0.2
                    )
            );

            String uri = "/v1beta/models/" + model + ":generateContent";

            String responseBody = restClient.post()
                    .uri(uri)
                    .header("x-goog-api-key", properties.getGemini().getApiKey().trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            String text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
            if (!text.isBlank()) {
                log.info("GeminiAttachmentUnderstandingProvider: Successfully analyzed image (length={})", text.length());
                return text.trim();
            }

        } catch (Exception e) {
            log.warn("Gemini vision analysis failed: {}", e.getMessage());
        }

        return "[Image fournie par l'utilisateur: " + mimeType + "]";
    }
}
