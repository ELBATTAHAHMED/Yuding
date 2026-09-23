package com.ahmed.aiservice.domain.provider.gemini;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.model.AiProviderType;
import com.ahmed.aiservice.domain.provider.AiChatCommand;
import com.ahmed.aiservice.domain.provider.AiChatResult;
import com.ahmed.aiservice.domain.provider.AiProvider;
import com.ahmed.aiservice.domain.provider.AiProviderMessage;
import com.ahmed.aiservice.domain.tool.AiToolCall;
import com.ahmed.aiservice.domain.tool.AiToolDefinition;
import com.ahmed.aiservice.domain.tool.AiToolResult;
import com.ahmed.aiservice.exception.AiProviderException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.*;

@Component
@Slf4j
public class GeminiAiProvider implements AiProvider {

    private final AiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiAiProvider(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        int timeoutMs = Math.max(5000, properties.getRequestTimeoutSeconds() * 1000);
        requestFactory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(timeoutMs));

        this.restClient = RestClient.builder()
                .baseUrl(properties.getGemini().getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public AiProviderType getProviderType() {
        return AiProviderType.GEMINI;
    }

    @Override
    public boolean isAvailable() {
        String key = properties.getGemini().getApiKey();
        return key != null && !key.isBlank();
    }

    @Override
    public AiChatResult chat(AiChatCommand command) {
        if (!isAvailable()) {
            throw new AiProviderException(
                    "Gemini API key is not configured",
                    "AI_CONFIGURATION_ERROR",
                    false,
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        String model = (command.getModel() != null && !command.getModel().isBlank())
                ? command.getModel()
                : properties.getPrimaryModel();

        Map<String, Object> requestPayload = buildGeminiPayload(command);
        long startTime = System.currentTimeMillis();

        try {
            String uri = "/v1beta/models/" + model + ":generateContent";

            String responseBody = restClient.post()
                    .uri(uri)
                    .header("x-goog-api-key", properties.getGemini().getApiKey().trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(String.class);

            long latencyMs = System.currentTimeMillis() - startTime;
            return parseGeminiResponse(responseBody, model, latencyMs);

        } catch (HttpClientErrorException ex) {
            long latencyMs = System.currentTimeMillis() - startTime;
            log.warn("GeminiAiProvider: HTTP client error [{}]: status={} latency={}ms",
                    ex.getStatusCode(), ex.getStatusCode().value(), latencyMs);

            if (ex.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                throw new AiProviderException("Gemini quota/rate limit exceeded", "AI_PROVIDER_RATE_LIMITED", true, HttpStatus.TOO_MANY_REQUESTS, ex);
            } else if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED || ex.getStatusCode() == HttpStatus.FORBIDDEN) {
                throw new AiProviderException("Gemini authentication failure", "AI_CONFIGURATION_ERROR", false, HttpStatus.UNAUTHORIZED, ex);
            } else if (ex.getStatusCode() == HttpStatus.BAD_REQUEST) {
                log.warn("Gemini 400 Bad Request body: {}", ex.getResponseBodyAsString());
                throw new AiProviderException("Gemini rejected input payload as invalid: " + ex.getResponseBodyAsString(), "AI_INVALID_REQUEST", false, HttpStatus.BAD_REQUEST, ex);
            } else {
                throw new AiProviderException("Gemini client error: " + ex.getStatusCode(), "AI_PROVIDER_UNAVAILABLE", false, (HttpStatus) ex.getStatusCode(), ex);
            }
        } catch (HttpServerErrorException ex) {
            long latencyMs = System.currentTimeMillis() - startTime;
            log.warn("GeminiAiProvider: HTTP server error from Gemini [{}]: latency={}ms", ex.getStatusCode(), latencyMs);
            throw new AiProviderException("Gemini service is temporarily unavailable", "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.SERVICE_UNAVAILABLE, ex);
        } catch (ResourceAccessException ex) {
            long latencyMs = System.currentTimeMillis() - startTime;
            log.warn("GeminiAiProvider: Connection timeout / network error: latency={}ms error={}", latencyMs, ex.getMessage());
            throw new AiProviderException("Gemini request timed out or network error", "AI_PROVIDER_TIMEOUT", true, HttpStatus.GATEWAY_TIMEOUT, ex);
        } catch (Exception ex) {
            long latencyMs = System.currentTimeMillis() - startTime;
            log.error("GeminiAiProvider: Unexpected failure: latency={}ms error={}", latencyMs, ex.getMessage());
            throw new AiProviderException("Gemini provider unexpected failure: " + ex.getMessage(), "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.INTERNAL_SERVER_ERROR, ex);
        }
    }

    private Map<String, Object> buildGeminiPayload(AiChatCommand command) {
        Map<String, Object> payload = new HashMap<>();

        if (command.getSystemInstruction() != null && !command.getSystemInstruction().isBlank()) {
            payload.put("system_instruction", Map.of(
                    "parts", List.of(Map.of("text", command.getSystemInstruction()))
            ));
        }

        List<Map<String, Object>> contents = new ArrayList<>();
        List<AiProviderMessage> messages = command.getMessages();

        if (messages != null && !messages.isEmpty()) {
            for (AiProviderMessage msg : messages) {
                String role = msg.getRole();
                if ("system".equalsIgnoreCase(role)) {
                    // System instructions already placed in system_instruction
                    continue;
                } else if ("user".equalsIgnoreCase(role)) {
                    contents.add(Map.of(
                            "role", "user",
                            "parts", List.of(Map.of("text", msg.getContent() != null ? msg.getContent() : ""))
                    ));
                } else if ("assistant".equalsIgnoreCase(role)) {
                    List<Map<String, Object>> parts = new ArrayList<>();
                    if (msg.getContent() != null && !msg.getContent().isBlank()) {
                        parts.add(Map.of("text", msg.getContent()));
                    }
                    if (msg.getToolCalls() != null) {
                        for (AiToolCall tc : msg.getToolCalls()) {
                            Map<String, Object> partMap = new LinkedHashMap<>();
                            partMap.put("functionCall", Map.of(
                                    "name", tc.getName(),
                                    "args", tc.getArguments() != null ? tc.getArguments() : Map.of()
                            ));
                            if (tc.getThoughtSignature() != null && !tc.getThoughtSignature().isBlank()) {
                                partMap.put("thoughtSignature", tc.getThoughtSignature());
                            }
                            parts.add(partMap);
                        }
                    }
                    if (!parts.isEmpty()) {
                        contents.add(Map.of("role", "model", "parts", parts));
                    }
                } else if ("tool".equalsIgnoreCase(role)) {
                    // Gemini expects functionResponse parts in a user turn
                    List<Map<String, Object>> parts = new ArrayList<>();
                    if (msg.getToolResults() != null) {
                        for (AiToolResult tr : msg.getToolResults()) {
                            Map<String, Object> responseData = tr.isSuccess()
                                    ? tr.getData()
                                    : Map.of("error", tr.getErrorMessage() != null ? tr.getErrorMessage() : "Tool failed");
                            parts.add(Map.of("functionResponse", Map.of(
                                    "name", tr.getToolName(),
                                    "response", Map.of("name", tr.getToolName(), "content", responseData)
                            )));
                        }
                    }
                    if (!parts.isEmpty()) {
                        contents.add(Map.of("role", "user", "parts", parts));
                    }
                }
            }
        } else if (command.getUserMessage() != null) {
            contents.add(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", command.getUserMessage()))
            ));
        }

        payload.put("contents", contents);

        // Map Tool Definitions if provided
        List<AiToolDefinition> tools = command.getTools();
        if (tools != null && !tools.isEmpty()) {
            List<Map<String, Object>> funcDecls = new ArrayList<>();
            for (AiToolDefinition def : tools) {
                Map<String, Object> decl = new LinkedHashMap<>();
                decl.put("name", def.getName());
                decl.put("description", def.getDescription());
                decl.put("parameters", convertSchemaForGemini(def.getParameterSchema()));
                funcDecls.add(decl);
            }
            payload.put("tools", List.of(Map.of("functionDeclarations", funcDecls)));
        }

        int maxTokens = command.getMaxTokens() > 0 ? command.getMaxTokens() : properties.getMaxOutputTokens();
        payload.put("generationConfig", Map.of(
                "maxOutputTokens", maxTokens,
                "temperature", 0.7
        ));

        return payload;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> convertSchemaForGemini(Map<String, Object> schema) {
        if (schema == null) return Map.of("type", "OBJECT");
        Map<String, Object> converted = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : schema.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if ("type".equals(key) && value instanceof String s) {
                converted.put(key, s.toUpperCase(Locale.ROOT));
            } else if ("properties".equals(key) && value instanceof Map<?, ?> props) {
                Map<String, Object> convertedProps = new LinkedHashMap<>();
                for (Map.Entry<?, ?> prop : props.entrySet()) {
                    if (prop.getValue() instanceof Map<?, ?> propMap) {
                        convertedProps.put(prop.getKey().toString(), convertSchemaForGemini((Map<String, Object>) propMap));
                    } else {
                        convertedProps.put(prop.getKey().toString(), prop.getValue());
                    }
                }
                converted.put(key, convertedProps);
            } else if ("items".equals(key) && value instanceof Map<?, ?> itemsMap) {
                converted.put(key, convertSchemaForGemini((Map<String, Object>) itemsMap));
            } else {
                converted.put(key, value);
            }
        }
        return converted;
    }

    private AiChatResult parseGeminiResponse(String responseBody, String model, long latencyMs) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new AiProviderException("Gemini returned empty candidate response", "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.SERVICE_UNAVAILABLE);
            }

            JsonNode firstCandidate = candidates.get(0);
            JsonNode parts = firstCandidate.path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                throw new AiProviderException("Gemini candidate has no parts", "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.SERVICE_UNAVAILABLE);
            }

            StringBuilder textBuilder = new StringBuilder();
            List<AiToolCall> toolCalls = new ArrayList<>();

            for (JsonNode part : parts) {
                if (part.has("text")) {
                    textBuilder.append(part.get("text").asText());
                }
                if (part.has("functionCall")) {
                    JsonNode fcNode = part.get("functionCall");
                    String funcName = fcNode.path("name").asText();
                    Map<String, Object> args = new HashMap<>();
                    if (fcNode.has("args") && !fcNode.get("args").isNull()) {
                        args = objectMapper.convertValue(fcNode.get("args"), new TypeReference<Map<String, Object>>() {});
                    }
                    String callId = fcNode.has("id") ? fcNode.get("id").asText() : "call_" + UUID.randomUUID().toString().substring(0, 8);
                    String thoughtSig = part.has("thoughtSignature") ? part.get("thoughtSignature").asText() : null;
                    toolCalls.add(new AiToolCall(callId, funcName, args, thoughtSig));
                }
            }

            Integer promptTokens = null;
            Integer completionTokens = null;
            if (root.has("usageMetadata")) {
                JsonNode usage = root.get("usageMetadata");
                promptTokens = usage.has("promptTokenCount") ? usage.get("promptTokenCount").asInt() : null;
                completionTokens = usage.has("candidatesTokenCount") ? usage.get("candidatesTokenCount").asInt() : null;
            }

            return AiChatResult.builder()
                    .content(textBuilder.toString().trim())
                    .toolCalls(toolCalls)
                    .provider("gemini")
                    .model(model)
                    .promptTokens(promptTokens)
                    .completionTokens(completionTokens)
                    .latencyMs(latencyMs)
                    .build();

        } catch (AiProviderException ape) {
            throw ape;
        } catch (Exception ex) {
            throw new AiProviderException("Failed to parse Gemini response payload", "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.INTERNAL_SERVER_ERROR, ex);
        }
    }
}
