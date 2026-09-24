package com.ahmed.aiservice.domain.attachment.repository;

import com.ahmed.aiservice.domain.attachment.entity.AttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttachmentRepository extends JpaRepository<AttachmentEntity, UUID> {

    List<AttachmentEntity> findByUserIdAndConversationIdOrderByCreatedAtAsc(UUID userId, UUID conversationId);

    Optional<AttachmentEntity> findByIdAndUserId(UUID id, UUID userId);

    Optional<AttachmentEntity> findByPublicReference(String publicReference);

    Optional<AttachmentEntity> findByPublicReferenceAndUserId(String publicReference, UUID userId);
}
