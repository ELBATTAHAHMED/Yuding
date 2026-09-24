package com.ahmed.aiservice.domain.rag.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetrievedChunk {
    private UUID chunkId;
    private String documentReference;
    private String title;
    private String slug;
    private String category;
    private String sectionTitle;
    private String content;
    private double similarityScore;
}
