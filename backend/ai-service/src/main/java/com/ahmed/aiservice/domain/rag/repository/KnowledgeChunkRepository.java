package com.ahmed.aiservice.domain.rag.repository;

import com.ahmed.aiservice.domain.rag.entity.KnowledgeChunkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeChunkRepository extends JpaRepository<KnowledgeChunkEntity, UUID> {

    @Query(value = """
        SELECT c.id AS id,
               d.public_reference AS documentReference,
               d.title AS title,
               d.slug AS slug,
               d.source_type AS category,
               c.section_title AS sectionTitle,
               c.content AS content,
               (c.embedding OPERATOR(ai.<=>) CAST(:queryVector AS ai.vector)) AS distance
        FROM ai.knowledge_chunks c
        JOIN ai.knowledge_documents d ON c.document_id = d.id
        WHERE d.status = 'ACTIVE'
          AND (:category IS NULL OR :category = '' OR d.source_type = :category)
          AND (c.embedding OPERATOR(ai.<=>) CAST(:queryVector AS ai.vector)) <= :maxDistance
        ORDER BY distance ASC
        LIMIT :topK
        """, nativeQuery = true)
    List<ChunkSearchResultProjection> searchSimilarChunks(
            @Param("queryVector") String queryVector,
            @Param("category") String category,
            @Param("maxDistance") double maxDistance,
            @Param("topK") int topK
    );

    @Modifying
    @Query("DELETE FROM KnowledgeChunkEntity c WHERE c.documentId = :documentId")
    void deleteByDocumentId(@Param("documentId") UUID documentId);

    long countByDocumentId(UUID documentId);
}
