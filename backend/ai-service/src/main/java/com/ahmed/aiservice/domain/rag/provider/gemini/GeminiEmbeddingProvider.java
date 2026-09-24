package com.ahmed.aiservice.domain.rag.provider.gemini;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.rag.provider.EmbeddingProvider;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Slf4j
@Component("geminiEmbeddingProvider")
public class GeminiEmbeddingProvider implements EmbeddingProvider {

    private final AiProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public GeminiEmbeddingProvider(AiProperties properties) {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public float[] embed(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Text to embed cannot be null or blank");
        }

        String apiKey = properties.getGemini().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key is not configured for embedding provider");
        }

        String model = properties.getRag().getEmbeddingModel();
        if (model == null || model.isBlank()) {
            model = "gemini-embedding-001";
        }
        int targetDimension = properties.getRag().getEmbeddingDimension();
        if (targetDimension <= 0) {
            targetDimension = 768;
        }

        String baseUrl = properties.getGemini().getBaseUrl();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }

        String url = String.format("%s/v1beta/models/%s:embedContent?key=%s", baseUrl, model, apiKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "models/" + model);
        requestBody.put("content", Map.of("parts", List.of(Map.of("text", text))));
        requestBody.put("outputDimensionality", targetDimension);

        try {
            String jsonPayload = objectMapper.writeValueAsString(requestBody);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("GeminiEmbeddingProvider: API error HTTP status={}, body={}", response.statusCode(), response.body());
                throw new RuntimeException("Gemini embedding request failed with HTTP " + response.statusCode());
            }

            GeminiEmbedResponse embedResponse = objectMapper.readValue(response.body(), GeminiEmbedResponse.class);
            if (embedResponse.getEmbedding() == null || embedResponse.getEmbedding().getValues() == null) {
                throw new RuntimeException("Gemini embedding response missing values");
            }

            List<Float> values = embedResponse.getEmbedding().getValues();
            if (values.size() != targetDimension) {
                throw new IllegalStateException(String.format(
                        "Embedding dimension mismatch: expected %d from config/database but model returned %d",
                        targetDimension, values.size()
                ));
            }

            float[] result = new float[values.size()];
            for (int i = 0; i < values.size(); i++) {
                result[i] = values.get(i);
            }
            return result;
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("GeminiEmbeddingProvider: Connection exception during embedding: {}", e.getMessage());
            throw new RuntimeException("Embedding generation failed: " + e.getMessage(), e);
        }
    }

    @Override
    public List<float[]> embedBatch(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return Collections.emptyList();
        }
        List<float[]> results = new ArrayList<>(texts.size());
        for (String text : texts) {
            results.add(embed(text));
        }
        return results;
    }

    @Override
    public int getDimension() {
        return properties.getRag().getEmbeddingDimension();
    }

    @Override
    public String getProviderName() {
        return "gemini";
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiEmbedResponse {
        private EmbeddingContent embedding;

        public EmbeddingContent getEmbedding() {
            return embedding;
        }

        public void setEmbedding(EmbeddingContent embedding) {
            this.embedding = embedding;
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class EmbeddingContent {
            private List<Float> values;

            public List<Float> getValues() {
                return values;
            }

            public void setValues(List<Float> values) {
                this.values = values;
            }
        }
    }
}
