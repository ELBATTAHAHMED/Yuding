package com.ahmed.aiservice.domain.provider;

import com.ahmed.aiservice.domain.tool.AiToolDefinition;
import lombok.Builder;
import lombok.Getter;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class AiChatCommand {
    private final UUID conversationId;
    private final String systemInstruction;
    private final String userMessage;
    private final List<AiProviderMessage> messages;
    private final List<AiToolDefinition> tools;
    private final String model;
    private final int maxTokens;
    private final int timeoutSeconds;

    public List<AiProviderMessage> getMessages() {
        return messages != null ? messages : Collections.emptyList();
    }

    public List<AiToolDefinition> getTools() {
        return tools != null ? tools : Collections.emptyList();
    }
}
