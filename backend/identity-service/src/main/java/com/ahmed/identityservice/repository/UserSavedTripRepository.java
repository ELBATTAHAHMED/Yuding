package com.ahmed.identityservice.repository;

import com.ahmed.identityservice.model.UserSavedTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSavedTripRepository extends JpaRepository<UserSavedTrip, UUID> {
    List<UserSavedTrip> findByUserIdOrderBySavedAtDesc(UUID userId);
    Optional<UserSavedTrip> findByUserIdAndTripPlanReference(UUID userId, String tripPlanReference);
    Optional<UserSavedTrip> findByPublicReferenceAndUserId(String publicReference, UUID userId);
    void deleteByPublicReferenceAndUserId(String publicReference, UUID userId);
    void deleteByUserIdAndTripPlanReference(UUID userId, String tripPlanReference);
    boolean existsByUserIdAndTripPlanReference(UUID userId, String tripPlanReference);
}
