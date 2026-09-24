package com.ahmed.aiservice.domain.planner.repository;

import com.ahmed.aiservice.domain.planner.entity.TripPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TripPlanRepository extends JpaRepository<TripPlanEntity, UUID> {

    List<TripPlanEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<TripPlanEntity> findByPublicReference(String publicReference);

    Optional<TripPlanEntity> findByPublicReferenceAndUserId(String publicReference, UUID userId);
}
