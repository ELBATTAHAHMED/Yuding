package com.ahmed.aiservice.domain.repository;

import com.ahmed.aiservice.domain.entity.AiToolCallEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiToolCallRepository extends JpaRepository<AiToolCallEntity, UUID> {

    List<AiToolCallEntity> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    List<AiToolCallEntity> findByAssistantMessageId(UUID assistantMessageId);
}
