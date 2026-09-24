package com.ahmed.aiservice.domain.planner.repository;

import com.ahmed.aiservice.domain.planner.entity.TripPlanDayEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TripPlanDayRepository extends JpaRepository<TripPlanDayEntity, UUID> {

    List<TripPlanDayEntity> findByTripPlanIdOrderByDayNumberAsc(UUID tripPlanId);
}
