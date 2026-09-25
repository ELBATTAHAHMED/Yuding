package com.ahmed.aiservice.domain.planner.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "trip_plan_items", schema = "ai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPlanItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_plan_id", nullable = false)
    private TripPlanEntity tripPlan;

    @Column(name = "item_type", nullable = false, length = 30)
    private String itemType; // FLIGHT, HOTEL, ACTIVITY, TRANSFER

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "provider", length = 50)
    private String provider;

    @Column(name = "offer_reference", length = 512)
    private String offerReference;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "currency", length = 3)
    private String currency;

    @Column(name = "price_in_budget_currency", precision = 12, scale = 2)
    private BigDecimal priceInBudgetCurrency;

    @Column(name = "is_priced", nullable = false)
    @Builder.Default
    private boolean isPriced = true;

    @Column(name = "day_number")
    private Integer dayNumber;

    @Column(name = "slot", length = 20)
    private String slot; // MORNING, AFTERNOON, EVENING, ALL_DAY

    @Column(name = "details_json", columnDefinition = "TEXT")
    private String detailsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
