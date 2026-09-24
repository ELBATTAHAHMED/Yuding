package com.ahmed.aiservice.domain.rag.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class KnowledgeChunkerTest {

    private final KnowledgeChunker chunker = new KnowledgeChunker();

    @Test
    @DisplayName("chunkDocument splits markdown by headings")
    void chunkDocument_splitsByHeadings() {
        String md = """
                # Titre Principal
                
                ## Section 1 : Introduction
                Voici le premier paragraphe de présentation qui contient des détails importants sur le voyage.
                
                ## Section 2 : Conditions
                Voici les conditions de réservation et d'annulation spécifiques au service.
                """;

        List<KnowledgeChunker.RawChunk> chunks = chunker.chunkDocument(md);

        assertThat(chunks).isNotEmpty();
        assertThat(chunks).allMatch(c -> c.content() != null && !c.content().isBlank());
        assertThat(chunks).allMatch(c -> c.contentHash() != null && c.contentHash().length() == 64);
    }

    @Test
    @DisplayName("chunkDocument returns empty list for blank content")
    void chunkDocument_empty() {
        assertThat(chunker.chunkDocument("")).isEmpty();
        assertThat(chunker.chunkDocument(null)).isEmpty();
    }

    @Test
    @DisplayName("computeSha256 produces deterministic hash")
    void computeSha256_deterministic() {
        String hash1 = KnowledgeChunker.computeSha256("test-content");
        String hash2 = KnowledgeChunker.computeSha256("test-content");
        String hash3 = KnowledgeChunker.computeSha256("other-content");

        assertThat(hash1).isEqualTo(hash2);
        assertThat(hash1).isNotEqualTo(hash3);
        assertThat(hash1).hasSize(64);
    }
}
