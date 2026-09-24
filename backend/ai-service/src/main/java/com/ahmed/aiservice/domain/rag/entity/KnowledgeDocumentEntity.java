package com.ahmed.aiservice.domain.rag.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "knowledge_documents", schema = "ai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeDocumentEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "public_reference", nullable = false, unique = true, length = 64)
    private String publicReference;

    @Column(name = "source_type", nullable = false, length = 64)
    private String sourceType; // "FAQ", "YUDING_POLICY", "CANCELLATION_POLICY", "DESTINATION_INFO", "SUPPORT", "TRAVEL_GUIDE"

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "slug", nullable = false, unique = true, length = 128)
    private String slug;

    @Builder.Default
    @Column(name = "language", nullable = false, length = 10)
    private String language = "fr";

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Builder.Default
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 24)
    private String status = "ACTIVE"; // "ACTIVE", "ARCHIVED", "DRAFT"

    @Column(name = "source_name", nullable = false, length = 128)
    private String sourceName;

    @Column(name = "source_uri", length = 512)
    private String sourceUri;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "jsonb")
    private String metadataJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (language == null) {
            language = "fr";
        }
        if (status == null) {
            status = "ACTIVE";
        }
        if (version == null) {
            version = 1;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}
