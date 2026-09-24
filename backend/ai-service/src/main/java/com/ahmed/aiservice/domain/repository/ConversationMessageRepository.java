package com.ahmed.aiservice.domain.repository;

import com.ahmed.aiservice.domain.entity.ConversationMessageEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ConversationMessageRepository extends JpaRepository<ConversationMessageEntity, UUID> {

    List<ConversationMessageEntity> findByConversationIdOrderBySequenceNumberAscCreatedAtAsc(UUID conversationId);

    List<ConversationMessageEntity> findByConversationIdOrderBySequenceNumberAscCreatedAtAsc(UUID conversationId, Pageable pageable);

    @Query("SELECT COALESCE(MAX(m.sequenceNumber), 0) FROM ConversationMessageEntity m WHERE m.conversationId = :conversationId")
    int findMaxSequenceNumber(@Param("conversationId") UUID conversationId);

    @Query("SELECT m FROM ConversationMessageEntity m WHERE m.conversationId = :conversationId ORDER BY m.sequenceNumber DESC, m.createdAt DESC")
    List<ConversationMessageEntity> findRecentMessagesDesc(@Param("conversationId") UUID conversationId, Pageable pageable);

    long countByConversationId(UUID conversationId);
}
