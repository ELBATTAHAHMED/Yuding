package com.ahmed.aiservice.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "messages", schema = "ai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationMessageEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "role", nullable = false, length = 20)
    private String role; // "USER", "ASSISTANT", "SYSTEM", "TOOL"

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "tool_calls_json", columnDefinition = "jsonb")
    private String toolCallsJson;

    @Column(name = "tool_call_id", length = 64)
    private String toolCallId;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Builder.Default
    @Column(name = "grounded")
    private Boolean grounded = false;

    @Column(name = "provider", length = 64)
    private String provider;

    @Column(name = "model", length = 64)
    private String model;

    @Builder.Default
    @Column(name = "tool_count")
    private Integer toolCount = 0;

    @Builder.Default
    @Column(name = "sequence_number", nullable = false)
    private Integer sequenceNumber = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (grounded == null) {
            grounded = false;
        }
        if (toolCount == null) {
            toolCount = 0;
        }
        if (sequenceNumber == null) {
            sequenceNumber = 0;
        }
    }
}
