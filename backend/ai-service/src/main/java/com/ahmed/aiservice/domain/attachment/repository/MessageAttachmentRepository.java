package com.ahmed.aiservice.domain.attachment.repository;

import com.ahmed.aiservice.domain.attachment.entity.MessageAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageAttachmentRepository extends JpaRepository<MessageAttachmentEntity, UUID> {

    List<MessageAttachmentEntity> findByMessageId(UUID messageId);

    @Query("SELECT ma FROM MessageAttachmentEntity ma JOIN FETCH ma.attachment WHERE ma.message.id = :messageId")
    List<MessageAttachmentEntity> findByMessageIdWithAttachment(@Param("messageId") UUID messageId);
}
