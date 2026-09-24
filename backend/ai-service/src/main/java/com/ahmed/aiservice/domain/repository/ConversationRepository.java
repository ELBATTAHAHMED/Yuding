package com.ahmed.aiservice.domain.repository;

import com.ahmed.aiservice.domain.entity.ConversationEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<ConversationEntity, UUID> {

    Optional<ConversationEntity> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByIdAndUserId(UUID id, UUID userId);

    @Modifying(clearAutomatically = true)
    @Query(value = "DELETE FROM ai.conversations WHERE id = :id AND user_id = :userId", nativeQuery = true)
    int deleteOwnedById(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT c FROM ConversationEntity c WHERE c.userId = :userId ORDER BY c.lastMessageAt DESC NULLS LAST, c.updatedAt DESC")
    List<ConversationEntity> findByUserIdOrderByActivity(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT c FROM ConversationEntity c WHERE c.userId = :userId ORDER BY c.lastMessageAt DESC NULLS LAST, c.updatedAt DESC")
    List<ConversationEntity> findAllByUserIdOrderByActivity(@Param("userId") UUID userId);
}
