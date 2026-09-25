package com.ahmed.identityservice.repository;

import com.ahmed.identityservice.model.UserRecentSearch;
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
public interface UserRecentSearchRepository extends JpaRepository<UserRecentSearch, UUID> {
    List<UserRecentSearch> findByUserIdOrderByLastSearchedAtDesc(UUID userId);
    Optional<UserRecentSearch> findByUserIdAndSearchTypeAndCriteriaHash(UUID userId, String searchType, String criteriaHash);
    Optional<UserRecentSearch> findByPublicReferenceAndUserId(String publicReference, UUID userId);
    void deleteByPublicReferenceAndUserId(String publicReference, UUID userId);
    void deleteAllByUserId(UUID userId);
    long countByUserId(UUID userId);

    @Modifying
    @Query(value = "DELETE FROM identity.user_recent_searches WHERE user_id = :userId AND last_searched_at < :cutoff", nativeQuery = true)
    void deleteExpiredSearches(@Param("userId") UUID userId, @Param("cutoff") Instant cutoff);

    @Modifying
    @Query(value = """
        DELETE FROM identity.user_recent_searches
        WHERE user_id = :userId AND id NOT IN (
            SELECT id FROM identity.user_recent_searches
            WHERE user_id = :userId
            ORDER BY last_searched_at DESC
            LIMIT :maxLimit
        )
        """, nativeQuery = true)
    void pruneExcessSearches(@Param("userId") UUID userId, @Param("maxLimit") int maxLimit);
}
