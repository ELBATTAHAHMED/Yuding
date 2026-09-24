package com.ahmed.aiservice.domain.planner.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "trip_plan_days", schema = "ai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPlanDayEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_plan_id", nullable = false)
    private TripPlanEntity tripPlan;

    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    @Column(name = "day_date", nullable = false)
    private LocalDate dayDate;

    @Column(name = "theme", length = 150)
    private String theme;

    @Column(name = "weather_forecast", columnDefinition = "TEXT")
    private String weatherForecast;

    @Column(name = "estimated_cost", precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    @Column(name = "morning_activities", columnDefinition = "TEXT")
    private String morningActivities;

    @Column(name = "afternoon_activities", columnDefinition = "TEXT")
    private String afternoonActivities;

    @Column(name = "evening_activities", columnDefinition = "TEXT")
    private String eveningActivities;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
