package com.ahmed.aiservice.domain.rag.repository;

import com.ahmed.aiservice.domain.rag.entity.KnowledgeDocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeDocumentRepository extends JpaRepository<KnowledgeDocumentEntity, UUID> {

    Optional<KnowledgeDocumentEntity> findBySlug(String slug);

    Optional<KnowledgeDocumentEntity> findByPublicReference(String publicReference);

    List<KnowledgeDocumentEntity> findByStatus(String status);
}
