package com.ahmed.aiservice.domain.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class AiToolExecutorTest {

    private AiToolExecutor executor;
    private AtomicInteger executionCount;

    @BeforeEach
    void setUp() {
        executionCount = new AtomicInteger(0);

        AiTool countingTool = new AiTool() {
            @Override
            public AiToolDefinition getDefinition() {
                return new AiToolDefinition("testTool", "A test tool", Map.of("type", "object"));
            }

            @Override
            public AiToolResult execute(AiToolCall call, AiToolExecutionContext context) {
                int count = executionCount.incrementAndGet();
                return AiToolResult.success(call.getId(), call.getName(), Map.of("count", count));
            }
        };

        AiTool failingTool = new AiTool() {
            @Override
            public AiToolDefinition getDefinition() {
                return new AiToolDefinition("failingTool", "Fails with exception", Map.of("type", "object"));
            }

            @Override
            public AiToolResult execute(AiToolCall call, AiToolExecutionContext context) {
                throw new RuntimeException("Simulated catastrophic crash");
            }
        };

        AiToolRegistry registry = new AiToolRegistry(List.of(countingTool, failingTool));
        executor = new AiToolExecutor(registry, new ObjectMapper(), 5);
    }

    @Test
    @DisplayName("Request-scoped deduplication returns cached result for identical call in same request")
    void testRequestScopedDeduplication() {
        Map<String, AiToolResult> requestCache = new ConcurrentHashMap<>();
        AiToolExecutionContext context = AiToolExecutionContext.anonymous();

        AiToolCall call1 = new AiToolCall("call-1", "testTool", Map.of("city", "Paris"));
        AiToolCall call2 = new AiToolCall("call-2", "testTool", Map.of("city", "Paris"));

        AiToolResult result1 = executor.execute(call1, context, requestCache);
        AiToolResult result2 = executor.execute(call2, context, requestCache);

        assertThat(result1.isSuccess()).isTrue();
        assertThat(result2.isSuccess()).isTrue();
        assertThat(result1.getData().get("count")).isEqualTo(1);
        assertThat(result2.getData().get("count")).isEqualTo(1);
        // Ensure the underlying tool was called ONLY once
        assertThat(executionCount.get()).isEqualTo(1);
        // Call IDs preserved per invocation
        assertThat(result1.getCallId()).isEqualTo("call-1");
        assertThat(result2.getCallId()).isEqualTo("call-2");
    }

    @Test
    @DisplayName("Unknown tool returns safe error without crashing")
    void testUnknownTool() {
        Map<String, AiToolResult> requestCache = new ConcurrentHashMap<>();
        AiToolCall call = new AiToolCall("call-x", "nonExistentTool", Map.of());

        AiToolResult result = executor.execute(call, AiToolExecutionContext.anonymous(), requestCache);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("not recognized");
    }

    @Test
    @DisplayName("Tool throwing uncaught exception is cleanly contained into error result")
    void testToolExceptionContained() {
        Map<String, AiToolResult> requestCache = new ConcurrentHashMap<>();
        AiToolCall call = new AiToolCall("call-fail", "failingTool", Map.of());

        AiToolResult result = executor.execute(call, AiToolExecutionContext.anonymous(), requestCache);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("Simulated catastrophic crash");
    }
}
