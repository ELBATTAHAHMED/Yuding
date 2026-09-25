package com.ahmed.identityservice.repository;

import com.ahmed.identityservice.model.SavedTraveler;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavedTravelerRepository extends JpaRepository<SavedTraveler, UUID> {
    List<SavedTraveler> findByUserIdOrderByCreatedAtAsc(UUID userId);
    Optional<SavedTraveler> findByPublicReferenceAndUserId(String reference, UUID userId);
}
