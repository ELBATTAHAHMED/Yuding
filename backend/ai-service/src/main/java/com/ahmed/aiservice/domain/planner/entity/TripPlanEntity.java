package com.ahmed.aiservice.domain.planner.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "trip_plans", schema = "ai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPlanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "public_reference", nullable = false, unique = true, length = 32)
    private String publicReference;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "origin", nullable = false, length = 100)
    private String origin;

    @Column(name = "destination", nullable = false, length = 100)
    private String destination;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "travelers", nullable = false)
    @Builder.Default
    private int travelers = 1;

    @Column(name = "budget", nullable = false, precision = 12, scale = 2)
    private BigDecimal budget;

    @Column(name = "budget_currency", nullable = false, length = 3)
    @Builder.Default
    private String budgetCurrency = "MAD";

    @Column(name = "priced_total", precision = 12, scale = 2)
    private BigDecimal pricedTotal;

    @Column(name = "remaining_budget", precision = 12, scale = 2)
    private BigDecimal remainingBudget;

    @Column(name = "unpriced_items_count", nullable = false)
    @Builder.Default
    private int unpricedItemsCount = 0;

    @Column(name = "budget_status", nullable = false, length = 30)
    private String budgetStatus; // WITHIN_BUDGET, OVER_BUDGET, PARTIALLY_PRICED

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "preferences", columnDefinition = "TEXT")
    private String preferences;

    @Column(name = "weather_summary", columnDefinition = "TEXT")
    private String weatherSummary;

    @Column(name = "data_freshness", nullable = false, length = 50)
    @Builder.Default
    private String dataFreshness = "FRESH";

    @Column(name = "version", nullable = false)
    @Builder.Default
    private int version = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "tripPlan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("dayNumber ASC")
    @Builder.Default
    private List<TripPlanDayEntity> days = new ArrayList<>();

    @OneToMany(mappedBy = "tripPlan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TripPlanItemEntity> items = new ArrayList<>();
}
