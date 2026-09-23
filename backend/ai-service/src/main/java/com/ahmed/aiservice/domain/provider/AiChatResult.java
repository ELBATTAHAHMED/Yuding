package com.ahmed.aiservice.domain.provider;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AiChatResult {
    private final String content;
    private final String provider;
    private final String model;
    private final Integer promptTokens;
    private final Integer completionTokens;
    private final long latencyMs;
}
