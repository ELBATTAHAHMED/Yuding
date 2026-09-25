package com.ahmed.identityservice.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
        name = "user_saved_trips",
        schema = "identity",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_user_saved_trips_plan", columnNames = {"user_id", "trip_plan_reference"})
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSavedTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "public_reference", nullable = false, unique = true, length = 24)
    private String publicReference;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "trip_plan_reference", nullable = false, length = 32)
    private String tripPlanReference;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "destination_city", nullable = false, length = 100)
    private String destinationCity;

    @Column(name = "origin_city", nullable = false, length = 100)
    private String originCity;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "travelers_count", nullable = false)
    @Builder.Default
    private Integer travelersCount = 1;

    @Column(name = "budget_amount", precision = 12, scale = 2)
    private BigDecimal budgetAmount;

    @Column(name = "budget_currency", length = 3)
    @Builder.Default
    private String budgetCurrency = "MAD";

    @Column(name = "plan_created_at")
    private Instant planCreatedAt;

    @Column(name = "saved_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant savedAt = Instant.now();
}
