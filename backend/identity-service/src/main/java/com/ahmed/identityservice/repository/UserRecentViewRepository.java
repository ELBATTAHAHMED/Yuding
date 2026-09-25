package com.ahmed.identityservice.repository;

import com.ahmed.identityservice.model.UserRecentView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRecentViewRepository extends JpaRepository<UserRecentView, UUID> {
    List<UserRecentView> findByUserIdOrderByLastViewedAtDesc(UUID userId);
    Optional<UserRecentView> findByUserIdAndResourceTypeAndResourceReference(UUID userId, String resourceType, String resourceReference);
    Optional<UserRecentView> findByPublicReferenceAndUserId(String publicReference, UUID userId);
    void deleteByPublicReferenceAndUserId(String publicReference, UUID userId);
    void deleteAllByUserId(UUID userId);
    long countByUserId(UUID userId);

    @Modifying
    @Query(value = "DELETE FROM identity.user_recent_views WHERE user_id = :userId AND last_viewed_at < :cutoff", nativeQuery = true)
    void deleteExpiredViews(@Param("userId") UUID userId, @Param("cutoff") Instant cutoff);

    @Modifying
    @Query(value = """
        DELETE FROM identity.user_recent_views
        WHERE user_id = :userId AND id NOT IN (
            SELECT id FROM identity.user_recent_views
            WHERE user_id = :userId
            ORDER BY last_viewed_at DESC
            LIMIT :maxLimit
        )
        """, nativeQuery = true)
    void pruneExcessViews(@Param("userId") UUID userId, @Param("maxLimit") int maxLimit);
}
