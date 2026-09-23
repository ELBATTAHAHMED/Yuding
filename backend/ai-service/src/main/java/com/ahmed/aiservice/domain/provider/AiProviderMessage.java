package com.ahmed.aiservice.domain.provider;

import com.ahmed.aiservice.domain.tool.AiToolCall;
import com.ahmed.aiservice.domain.tool.AiToolResult;
import lombok.Builder;
import lombok.Getter;

import java.util.Collections;
import java.util.List;

/**
 * Provider-neutral message used in multi-round conversational tool calling.
 */
@Getter
@Builder
public class AiProviderMessage {

    private final String role; // "system", "user", "assistant", "tool"
    private final String content;
    private final List<AiToolCall> toolCalls;
    private final List<AiToolResult> toolResults;

    public static AiProviderMessage system(String content) {
        return AiProviderMessage.builder()
                .role("system")
                .content(content)
                .build();
    }

    public static AiProviderMessage user(String content) {
        return AiProviderMessage.builder()
                .role("user")
                .content(content)
                .build();
    }

    public static AiProviderMessage assistant(String content) {
        return AiProviderMessage.builder()
                .role("assistant")
                .content(content)
                .build();
    }

    public static AiProviderMessage assistantWithToolCalls(String content, List<AiToolCall> toolCalls) {
        return AiProviderMessage.builder()
                .role("assistant")
                .content(content)
                .toolCalls(toolCalls != null ? toolCalls : Collections.emptyList())
                .build();
    }

    public static AiProviderMessage toolResults(List<AiToolResult> results) {
        return AiProviderMessage.builder()
                .role("tool")
                .toolResults(results != null ? results : Collections.emptyList())
                .build();
    }
}
