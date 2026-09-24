package com.ahmed.aiservice.domain.rag.repository;

import java.util.UUID;

public interface ChunkSearchResultProjection {
    UUID getId();
    String getDocumentReference();
    String getTitle();
    String getSlug();
    String getCategory();
    String getSectionTitle();
    String getContent();
    Double getDistance();
}
