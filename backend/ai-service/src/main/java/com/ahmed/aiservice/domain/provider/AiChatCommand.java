package com.ahmed.aiservice.domain.provider;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class AiChatCommand {
    private final UUID conversationId;
    private final String systemInstruction;
    private final String userMessage;
    private final String model;
    private final int maxTokens;
    private final int timeoutSeconds;
}
