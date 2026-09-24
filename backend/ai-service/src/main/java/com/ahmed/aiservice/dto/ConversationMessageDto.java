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
public class ConversationMessageDto {
    private UUID id;
    private UUID conversationId;
    private String role; // "user", "assistant"
    private String content;
    @Builder.Default
    private boolean grounded = false;
    @Builder.Default
    private List<String> toolsUsed = Collections.emptyList();
    private Instant createdAt;
}
