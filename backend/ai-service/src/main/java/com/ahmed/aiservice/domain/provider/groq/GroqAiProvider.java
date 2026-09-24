package com.ahmed.aiservice.domain.provider.groq;

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
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.X509Certificate;

@Component
@Slf4j
public class GroqAiProvider implements AiProvider {

    private final AiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GroqAiProvider(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        SSLSocketFactory sslSocketFactory = createTrustAllSocketFactory();
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(java.net.HttpURLConnection connection, String httpMethod) throws java.io.IOException {
                if (connection instanceof javax.net.ssl.HttpsURLConnection httpsConn && sslSocketFactory != null) {
                    httpsConn.setSSLSocketFactory(sslSocketFactory);
                }
                super.prepareConnection(connection, httpMethod);
            }
        };
        int timeoutMs = Math.max(5000, properties.getRequestTimeoutSeconds() * 1000);
        requestFactory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(timeoutMs));

        this.restClient = RestClient.builder()
                .baseUrl(properties.getGroq().getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    private SSLSocketFactory createTrustAllSocketFactory() {
        try {
            SSLContext context = SSLContext.getInstance("TLS");
            TrustManager[] trustAllCerts = new TrustManager[]{
                    new X509TrustManager() {
                        public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                        public void checkClientTrusted(X509Certificate[] certs, String authType) {}
                        public void checkServerTrusted(X509Certificate[] certs, String authType) {}
                    }
            };
            context.init(null, trustAllCerts, new java.security.SecureRandom());
            return context.getSocketFactory();
        } catch (Exception e) {
            log.warn("GroqAiProvider: Could not create SSLSocketFactory: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public AiProviderType getProviderType() {
        return AiProviderType.GROQ;
    }

    @Override
    public boolean isAvailable() {
        String key = properties.getGroq().getApiKey();
        return key != null && !key.isBlank();
    }

    @Override
    public AiChatResult chat(AiChatCommand command) {
        if (!isAvailable()) {
            throw new AiProviderException(
                    "Groq API key is not configured",
                    "AI_CONFIGURATION_ERROR",
                    false,
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        String defaultGroqModel = "groq".equalsIgnoreCase(properties.getPrimaryProvider())
                ? properties.getPrimaryModel()
                : properties.getFallbackModel();
        if (defaultGroqModel == null || defaultGroqModel.isBlank() || defaultGroqModel.startsWith("gemini") || "openai/gpt-oss-120b".equalsIgnoreCase(defaultGroqModel)) {
            defaultGroqModel = "qwen/qwen3.8-27b";
        }

        String model = (command.getModel() != null && !command.getModel().isBlank() && !"openai/gpt-oss-120b".equalsIgnoreCase(command.getModel()))
                ? command.getModel()
                : defaultGroqModel;

        Map<String, Object> requestPayload = buildGroqPayload(command, model);
        int maxAttempts = 5;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            long startTime = System.currentTimeMillis();
            try {
                String responseBody = restClient.post()
                        .uri("/chat/completions")
                        .header("Authorization", "Bearer " + properties.getGroq().getApiKey().trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestPayload)
                        .retrieve()
                        .body(String.class);

                long latencyMs = System.currentTimeMillis() - startTime;
                return parseGroqResponse(responseBody, model, latencyMs);

            } catch (HttpClientErrorException ex) {
                long latencyMs = System.currentTimeMillis() - startTime;
                log.warn("GroqAiProvider: HTTP client error [{}]: latency={}ms attempt={}/{}", ex.getStatusCode(), latencyMs, attempt, maxAttempts);

                if (ex.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                    if (attempt < maxAttempts) {
                        long sleepMs = 5000L * attempt;
                        try {
                            String errorBody = ex.getResponseBodyAsString();
                            log.info("Groq 429 response body: {}", errorBody);

                            java.util.regex.Matcher mSec = java.util.regex.Pattern.compile("try again in ([0-9]+(?:\\.[0-9]+)?)s", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(errorBody);
                            java.util.regex.Matcher mMinSec = java.util.regex.Pattern.compile("try again in ([0-9]+)m([0-9]+(?:\\.[0-9]+)?)s", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(errorBody);
                            java.util.regex.Matcher mMs = java.util.regex.Pattern.compile("try again in ([0-9]+(?:\\.[0-9]+)?)ms", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(errorBody);

                            if (mSec.find()) {
                                double sec = Double.parseDouble(mSec.group(1));
                                sleepMs = Math.max(1000L, (long) (sec * 1000) + 1500L);
                            } else if (mMinSec.find()) {
                                double min = Double.parseDouble(mMinSec.group(1));
                                double sec = Double.parseDouble(mMinSec.group(2));
                                sleepMs = (long) ((min * 60 + sec) * 1000) + 1500L;
                            } else if (mMs.find()) {
                                double ms = Double.parseDouble(mMs.group(1));
                                sleepMs = (long) ms + 1000L;
                            } else {
                                org.springframework.http.HttpHeaders headers = ex.getResponseHeaders();
                                if (headers != null) {
                                    String resetTokens = headers.getFirst("x-ratelimit-reset-tokens");
                                    String retryAfter = headers.getFirst("Retry-After");
                                    String resetRequests = headers.getFirst("x-ratelimit-reset-requests");

                                    String waitHeader = (resetTokens != null && !resetTokens.isBlank()) ? resetTokens
                                            : (retryAfter != null && !retryAfter.isBlank()) ? retryAfter
                                            : resetRequests;

                                    if (waitHeader != null && !waitHeader.isBlank()) {
                                        String clean = waitHeader.replace("s", "").trim();
                                        double seconds = Double.parseDouble(clean);
                                        sleepMs = Math.max(1500L, (long) (seconds * 1000) + 1200L);
                                    }
                                }
                            }
                        } catch (Exception parseEx) {
                            log.warn("Failed to parse 429 retry duration: {}", parseEx.getMessage());
                        }

                        if (sleepMs > 45000L) {
                            log.warn("Groq rate limit sleep duration ({}ms) exceeds 45s threshold. Failing fast.", sleepMs);
                            throw new AiProviderException("Groq rate limit exceeded (extended quota limit)", "AI_PROVIDER_RATE_LIMITED", true, HttpStatus.TOO_MANY_REQUESTS, ex);
                        }

                        log.info("Groq rate limited (429). Sleeping {}ms before retry (attempt {}/{})", sleepMs, attempt, maxAttempts);
                        try {
                            Thread.sleep(sleepMs);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                        }
                        continue;
                    }
                    throw new AiProviderException("Groq rate limit exceeded", "AI_PROVIDER_RATE_LIMITED", true, HttpStatus.TOO_MANY_REQUESTS, ex);
                } else if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED || ex.getStatusCode() == HttpStatus.FORBIDDEN) {
                    throw new AiProviderException("Groq authentication failure", "AI_CONFIGURATION_ERROR", false, HttpStatus.UNAUTHORIZED, ex);
                } else if (ex.getStatusCode() == HttpStatus.BAD_REQUEST) {
                    String errorBody = ex.getResponseBodyAsString();
                    log.warn("Groq 400 Bad Request body: {}", errorBody);
                    if (errorBody.contains("tool_use_failed") || errorBody.contains("Tool choice is none")) {
                        try {
                            JsonNode errRoot = objectMapper.readTree(errorBody);
                            String failedGen = errRoot.path("error").path("failed_generation").asText("");
                            if (!failedGen.isBlank()) {
                                log.info("GroqAiProvider: Recovered failed_generation from tool_use_failed: length={}", failedGen.length());
                                return AiChatResult.builder()
                                        .content(failedGen.trim())
                                        .toolCalls(Collections.emptyList())
                                        .provider("groq")
                                        .model(model)
                                        .latencyMs(latencyMs)
                                        .build();
                            }
                        } catch (Exception parseEx) {
                            log.warn("Failed to parse failed_generation from Groq 400: {}", parseEx.getMessage());
                        }
                    }
                    throw new AiProviderException("Groq rejected input payload as invalid: " + errorBody, "AI_INVALID_REQUEST", false, HttpStatus.BAD_REQUEST, ex);
                } else {
                    throw new AiProviderException("Groq client error: " + ex.getStatusCode(), "AI_PROVIDER_UNAVAILABLE", false, (HttpStatus) ex.getStatusCode(), ex);
                }
            } catch (HttpServerErrorException ex) {
                long latencyMs = System.currentTimeMillis() - startTime;
                log.warn("GroqAiProvider: HTTP server error from Groq [{}]: latency={}ms attempt={}/{}", ex.getStatusCode(), latencyMs, attempt, maxAttempts);
                if (attempt < maxAttempts) {
                    try { Thread.sleep(1000L * attempt); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    continue;
                }
                throw new AiProviderException("Groq service is temporarily unavailable", "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.SERVICE_UNAVAILABLE, ex);
            } catch (ResourceAccessException ex) {
                long latencyMs = System.currentTimeMillis() - startTime;
                log.warn("GroqAiProvider: Connection timeout / network error: latency={}ms error={}", latencyMs, ex.getMessage());
                throw new AiProviderException("Groq request timed out or network error", "AI_PROVIDER_TIMEOUT", true, HttpStatus.GATEWAY_TIMEOUT, ex);
            } catch (AiProviderException ape) {
                throw ape;
            } catch (Exception ex) {
                long latencyMs = System.currentTimeMillis() - startTime;
                log.error("GroqAiProvider: Unexpected failure: latency={}ms error={}", latencyMs, ex.getMessage());
                throw new AiProviderException("Groq provider unexpected failure: " + ex.getMessage(), "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.INTERNAL_SERVER_ERROR, ex);
            }
        }
        throw new AiProviderException("Groq request failed after all attempts", "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.SERVICE_UNAVAILABLE);
    }

    private Map<String, Object> buildGroqPayload(AiChatCommand command, String model) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("model", model);

        List<Map<String, Object>> messages = new ArrayList<>();
        if (command.getSystemInstruction() != null && !command.getSystemInstruction().isBlank()) {
            messages.add(Map.of("role", "system", "content", command.getSystemInstruction()));
        }

        List<AiProviderMessage> inputMessages = command.getMessages();
        if (inputMessages != null && !inputMessages.isEmpty()) {
            for (AiProviderMessage msg : inputMessages) {
                String role = msg.getRole();
                if ("system".equalsIgnoreCase(role)) {
                    // System already handled
                    continue;
                } else if ("user".equalsIgnoreCase(role)) {
                    messages.add(Map.of("role", "user", "content", msg.getContent() != null ? msg.getContent() : ""));
                } else if ("assistant".equalsIgnoreCase(role)) {
                    Map<String, Object> asstMsg = new LinkedHashMap<>();
                    asstMsg.put("role", "assistant");
                    if (msg.getContent() != null && !msg.getContent().isBlank()) {
                        asstMsg.put("content", msg.getContent());
                    } else {
                        asstMsg.put("content", "");
                    }
                    if (msg.getToolCalls() != null && !msg.getToolCalls().isEmpty()) {
                        List<Map<String, Object>> toolCalls = new ArrayList<>();
                        for (AiToolCall tc : msg.getToolCalls()) {
                            try {
                                String argsJson = objectMapper.writeValueAsString(tc.getArguments());
                                toolCalls.add(Map.of(
                                        "id", tc.getId(),
                                        "type", "function",
                                        "function", Map.of(
                                                "name", tc.getName(),
                                                "arguments", argsJson
                                        )
                                ));
                            } catch (Exception e) {
                                log.warn("Failed to serialize tool call arguments for Groq: {}", e.getMessage());
                            }
                        }
                        asstMsg.put("tool_calls", toolCalls);
                    }
                    messages.add(asstMsg);
                } else if ("tool".equalsIgnoreCase(role)) {
                    if (msg.getToolResults() != null) {
                        for (AiToolResult tr : msg.getToolResults()) {
                            try {
                                String contentJson = objectMapper.writeValueAsString(
                                        tr.isSuccess() ? tr.getData() : Map.of("error", tr.getErrorMessage() != null ? tr.getErrorMessage() : "Tool failed")
                                );
                                Map<String, Object> toolMsg = new LinkedHashMap<>();
                                toolMsg.put("role", "tool");
                                toolMsg.put("tool_call_id", tr.getCallId());
                                toolMsg.put("name", tr.getToolName());
                                toolMsg.put("content", contentJson);
                                messages.add(toolMsg);
                            } catch (Exception e) {
                                log.warn("Failed to serialize tool result for Groq: {}", e.getMessage());
                            }
                        }
                    }
                }
            }
        } else if (command.getUserMessage() != null) {
            messages.add(Map.of("role", "user", "content", command.getUserMessage()));
        }

        payload.put("messages", messages);

        // Map Tool Definitions if provided
        List<AiToolDefinition> tools = command.getTools();
        if (tools != null && !tools.isEmpty()) {
            List<Map<String, Object>> groqTools = new ArrayList<>();
            for (AiToolDefinition def : tools) {
                groqTools.add(Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", def.getName(),
                                "description", def.getDescription(),
                                "parameters", def.getParameterSchema()
                        )
                ));
            }
            payload.put("tools", groqTools);
        }

        int maxTokens = command.getMaxTokens() > 0 ? command.getMaxTokens() : properties.getMaxOutputTokens();
        payload.put("max_tokens", maxTokens);
        payload.put("temperature", 0.7);

        return payload;
    }

    private AiChatResult parseGroqResponse(String responseBody, String model, long latencyMs) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                throw new AiProviderException("Groq returned empty choices response", "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.SERVICE_UNAVAILABLE);
            }

            JsonNode firstChoice = choices.get(0);
            JsonNode messageNode = firstChoice.path("message");
            String content = messageNode.path("content").asText("");

            List<AiToolCall> toolCalls = new ArrayList<>();
            if (messageNode.has("tool_calls") && messageNode.get("tool_calls").isArray()) {
                for (JsonNode tcNode : messageNode.get("tool_calls")) {
                    String id = tcNode.path("id").asText("call_" + UUID.randomUUID().toString().substring(0, 8));
                    String funcName = tcNode.path("function").path("name").asText();
                    String argsStr = tcNode.path("function").path("arguments").asText("{}");
                    Map<String, Object> args = new HashMap<>();
                    try {
                        args = objectMapper.readValue(argsStr, new TypeReference<Map<String, Object>>() {});
                    } catch (Exception e) {
                        log.warn("Failed to parse tool call arguments string from Groq: {}", argsStr);
                    }
                    toolCalls.add(new AiToolCall(id, funcName, args));
                }
            }

            Integer promptTokens = null;
            Integer completionTokens = null;
            if (root.has("usage")) {
                JsonNode usage = root.get("usage");
                promptTokens = usage.has("prompt_tokens") ? usage.get("prompt_tokens").asInt() : null;
                completionTokens = usage.has("completion_tokens") ? usage.get("completion_tokens").asInt() : null;
            }

            return AiChatResult.builder()
                    .content(content.trim())
                    .toolCalls(toolCalls)
                    .provider("groq")
                    .model(model)
                    .promptTokens(promptTokens)
                    .completionTokens(completionTokens)
                    .latencyMs(latencyMs)
                    .build();

        } catch (AiProviderException ape) {
            throw ape;
        } catch (Exception ex) {
            throw new AiProviderException("Failed to parse Groq response payload", "AI_PROVIDER_UNAVAILABLE", true, HttpStatus.INTERNAL_SERVER_ERROR, ex);
        }
    }
}
