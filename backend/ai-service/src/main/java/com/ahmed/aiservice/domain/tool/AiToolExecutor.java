package com.ahmed.aiservice.domain.tool;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.*;

/**
 * Manages the execution of AI tools with timeout protection, error containment,
 * safe observability, and request-scoped deduplication.
 */
@Component
public class AiToolExecutor {

    private static final Logger log = LoggerFactory.getLogger(AiToolExecutor.class);

    private final AiToolRegistry registry;
    private final ObjectMapper objectMapper;
    private final int toolTimeoutSeconds;
    private final ExecutorService executorService;

    public AiToolExecutor(AiToolRegistry registry,
                          ObjectMapper objectMapper,
                          @Value("${yuding.ai.tool-timeout-seconds:35}") int toolTimeoutSeconds) {
        this.registry = registry;
        this.objectMapper = objectMapper;
        this.toolTimeoutSeconds = toolTimeoutSeconds;
        this.executorService = Executors.newCachedThreadPool();
    }

    /**
     * Executes an AI tool call with timeout protection and request-scoped caching.
     *
     * @param call the requested tool call from the model
     * @param context caller authentication and authorization context
     * @param requestCache request-scoped cache to deduplicate identical tool calls
     * @return tool execution result (success or safe error)
     */
    public AiToolResult execute(AiToolCall call, AiToolExecutionContext context, Map<String, AiToolResult> requestCache) {
        long startTime = System.currentTimeMillis();
        String toolName = call.getName();
        String callId = call.getId();

        // 1. Check registry
        Optional<AiTool> toolOpt = registry.getTool(toolName);
        if (toolOpt.isEmpty()) {
            log.warn("Model requested unknown tool: name='{}', callId='{}'", toolName, callId);
            return AiToolResult.error(callId, toolName, "Tool '" + toolName + "' is not recognized by Yuding.");
        }

        // 2. Request-scoped deduplication
        String cacheKey = buildCacheKey(toolName, call.getArguments());
        if (requestCache != null && requestCache.containsKey(cacheKey)) {
            AiToolResult cached = requestCache.get(cacheKey);
            log.info("Tool execution cache hit: name='{}', callId='{}'", toolName, callId);
            // Return result with the current callId
            if (cached.isSuccess()) {
                return AiToolResult.success(callId, toolName, cached.getData());
            } else {
                return AiToolResult.error(callId, toolName, cached.getErrorMessage());
            }
        }

        AiTool tool = toolOpt.get();
        log.info("Executing AI tool: name='{}', callId='{}'", toolName, callId);

        // 3. Execute with timeout
        AiToolResult result;
        Future<AiToolResult> future = executorService.submit(() -> {
            try {
                return tool.execute(call, context);
            } catch (Exception e) {
                log.error("Unhandled exception in tool '{}': {}", toolName, e.getMessage(), e);
                return AiToolResult.error(callId, toolName, "Execution error in tool '" + toolName + "': " + e.getMessage());
            }
        });

        try {
            result = future.get(toolTimeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException te) {
            future.cancel(true);
            long elapsed = System.currentTimeMillis() - startTime;
            log.warn("Tool '{}' timed out after {}ms (limit: {}s)", toolName, elapsed, toolTimeoutSeconds);
            result = AiToolResult.error(callId, toolName, "Tool execution timed out after " + toolTimeoutSeconds + " seconds.");
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            result = AiToolResult.error(callId, toolName, "Tool execution was interrupted.");
        } catch (ExecutionException ee) {
            Throwable cause = ee.getCause() != null ? ee.getCause() : ee;
            log.error("Execution error executing tool '{}': {}", toolName, cause.getMessage(), cause);
            result = AiToolResult.error(callId, toolName, "Tool execution failed: " + cause.getMessage());
        }

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("Completed AI tool execution: name='{}', callId='{}', status={}, durationMs={}",
                toolName, callId, result.getStatus(), elapsed);

        // 4. Cache result for this request
        if (requestCache != null) {
            requestCache.put(cacheKey, result);
        }

        return result;
    }

    private String buildCacheKey(String toolName, Map<String, Object> arguments) {
        try {
            return toolName + ":" + objectMapper.writeValueAsString(arguments != null ? arguments : Map.of());
        } catch (JsonProcessingException e) {
            return toolName + ":" + (arguments != null ? arguments.toString() : "");
        }
    }
}
