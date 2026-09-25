package com.ahmed.identityservice.repository;

import com.ahmed.identityservice.model.UserFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, UUID> {
    List<UserFavorite> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<UserFavorite> findByUserIdAndResourceTypeAndResourceReference(UUID userId, String resourceType, String resourceReference);
    Optional<UserFavorite> findByPublicReferenceAndUserId(String publicReference, UUID userId);
    void deleteByPublicReferenceAndUserId(String publicReference, UUID userId);
    void deleteByUserIdAndResourceTypeAndResourceReference(UUID userId, String resourceType, String resourceReference);
    boolean existsByUserIdAndResourceTypeAndResourceReference(UUID userId, String resourceType, String resourceReference);
}
