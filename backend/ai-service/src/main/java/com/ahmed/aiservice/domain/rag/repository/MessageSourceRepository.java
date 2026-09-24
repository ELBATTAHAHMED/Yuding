package com.ahmed.aiservice.domain.rag.repository;

import com.ahmed.aiservice.domain.rag.entity.MessageSourceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageSourceRepository extends JpaRepository<MessageSourceEntity, UUID> {

    List<MessageSourceEntity> findByMessageId(UUID messageId);
}
