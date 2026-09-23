package com.ahmed.aiservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {

    private UUID conversationId;
    private UUID messageId;
    @Builder.Default
    private String role = "assistant";
    private String content;
    private Instant createdAt;

    public static AiChatResponse of(UUID conversationId, String content) {
        return AiChatResponse.builder()
                .conversationId(conversationId)
                .messageId(UUID.randomUUID())
                .role("assistant")
                .content(content)
                .createdAt(Instant.now())
                .build();
    }
}
