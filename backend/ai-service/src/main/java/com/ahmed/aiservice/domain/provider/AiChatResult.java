package com.ahmed.aiservice.domain.provider;

import com.ahmed.aiservice.domain.tool.AiToolCall;
import lombok.Builder;
import lombok.Getter;

import java.util.Collections;
import java.util.List;

@Getter
@Builder
public class AiChatResult {
    private final String content;
    private final List<AiToolCall> toolCalls;
    private final String provider;
    private final String model;
    private final Integer promptTokens;
    private final Integer completionTokens;
    private final long latencyMs;

    public List<AiToolCall> getToolCalls() {
        return toolCalls != null ? toolCalls : Collections.emptyList();
    }

    public boolean hasToolCalls() {
        return toolCalls != null && !toolCalls.isEmpty();
    }
}
