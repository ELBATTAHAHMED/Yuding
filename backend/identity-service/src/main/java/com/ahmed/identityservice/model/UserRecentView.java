package com.ahmed.identityservice.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "user_recent_views",
        schema = "identity",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_user_recent_views_resource", columnNames = {"user_id", "resource_type", "resource_reference"})
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRecentView {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "public_reference", nullable = false, unique = true, length = 24)
    private String publicReference;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "resource_type", nullable = false, length = 32)
    private String resourceType;

    @Column(name = "resource_reference", nullable = false, length = 512)
    private String resourceReference;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "destination", length = 255)
    private String destination;

    @Column(name = "thumbnail_url", length = 2048)
    private String thumbnailUrl;

    @Column(name = "provider_label", length = 64)
    private String providerLabel;

    @Column(name = "last_viewed_at", nullable = false)
    @Builder.Default
    private Instant lastViewedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
