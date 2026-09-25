package com.ahmed.identityservice.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
        name = "user_recent_searches",
        schema = "identity",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_user_recent_searches_hash", columnNames = {"user_id", "search_type", "criteria_hash"})
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRecentSearch {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "public_reference", nullable = false, unique = true, length = 24)
    private String publicReference;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "search_type", nullable = false, length = 32)
    private String searchType;

    @Column(name = "criteria_hash", nullable = false, length = 64)
    private String criteriaHash;

    @Column(name = "origin", length = 100)
    private String origin;

    @Column(name = "destination", length = 100)
    private String destination;

    @Column(name = "departure_date")
    private LocalDate departureDate;

    @Column(name = "return_date")
    private LocalDate returnDate;

    @Column(name = "travelers_count")
    @Builder.Default
    private Integer travelersCount = 1;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "criteria_payload", nullable = false, columnDefinition = "jsonb")
    private String criteriaPayload;

    @Column(name = "last_searched_at", nullable = false)
    @Builder.Default
    private Instant lastSearchedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
