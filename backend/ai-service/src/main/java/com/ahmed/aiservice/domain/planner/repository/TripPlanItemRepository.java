package com.ahmed.aiservice.domain.planner.repository;

import com.ahmed.aiservice.domain.planner.entity.TripPlanItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TripPlanItemRepository extends JpaRepository<TripPlanItemEntity, UUID> {

    List<TripPlanItemEntity> findByTripPlanId(UUID tripPlanId);
}
