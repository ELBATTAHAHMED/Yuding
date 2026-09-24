package com.ahmed.aiservice.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tool_calls", schema = "ai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiToolCallEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "assistant_message_id")
    private UUID assistantMessageId;

    @Column(name = "tool_name", nullable = false, length = 64)
    private String toolName;

    @Column(name = "tool_call_id", length = 128)
    private String toolCallId;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "arguments_json", columnDefinition = "jsonb")
    private String argumentsJson;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 32)
    private String status = "SUCCESS";

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "result_summary_json", columnDefinition = "jsonb")
    private String resultSummaryJson;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "duration_ms")
    private Long durationMs;

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
        if (status == null) {
            status = "SUCCESS";
        }
    }
}
