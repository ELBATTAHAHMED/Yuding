package com.ahmed.aiservice.domain.provider;

import com.ahmed.aiservice.domain.model.AiProviderType;

public interface AiProvider {

    AiProviderType getProviderType();

    AiChatResult chat(AiChatCommand command);

    boolean isAvailable();
}
