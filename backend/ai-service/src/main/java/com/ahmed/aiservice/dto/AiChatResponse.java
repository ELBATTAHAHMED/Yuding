package com.ahmed.aiservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
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

    /**
     * True if the assistant's answer is grounded in live provider tool results.
     */
    @Builder.Default
    private boolean grounded = false;

    /**
     * Unique names of Yuding tools utilized to form this answer.
     */
    @Builder.Default
    private List<String> toolsUsed = Collections.emptyList();

    public static AiChatResponse of(UUID conversationId, String content) {
        return AiChatResponse.builder()
                .conversationId(conversationId)
                .messageId(UUID.randomUUID())
                .role("assistant")
                .content(content)
                .createdAt(Instant.now())
                .grounded(false)
                .toolsUsed(Collections.emptyList())
                .build();
    }

    public static AiChatResponse grounded(UUID conversationId, String content, List<String> toolsUsed) {
        return AiChatResponse.builder()
                .conversationId(conversationId)
                .messageId(UUID.randomUUID())
                .role("assistant")
                .content(content)
                .createdAt(Instant.now())
                .grounded(toolsUsed != null && !toolsUsed.isEmpty())
                .toolsUsed(toolsUsed != null ? toolsUsed : Collections.emptyList())
                .build();
    }
}
