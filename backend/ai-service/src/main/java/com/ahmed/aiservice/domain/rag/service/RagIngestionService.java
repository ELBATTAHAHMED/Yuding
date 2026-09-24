package com.ahmed.aiservice.domain.rag.service;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.rag.entity.KnowledgeDocumentEntity;
import com.ahmed.aiservice.domain.rag.provider.EmbeddingProvider;
import com.ahmed.aiservice.domain.rag.repository.KnowledgeChunkRepository;
import com.ahmed.aiservice.domain.rag.repository.KnowledgeDocumentRepository;
import com.ahmed.aiservice.domain.rag.util.VectorUtils;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Service
@Slf4j
public class RagIngestionService {

    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "FAQ", "YUDING_POLICY", "CANCELLATION_POLICY", "DESTINATION_INFO", "SUPPORT", "TRAVEL_GUIDE"
    );

    private static final List<String> SENSITIVE_KEYWORDS = List.of(
            ".env", "secret", "key", "password", "credential", "token", "private_key"
    );

    private final AiProperties properties;
    private final KnowledgeDocumentRepository documentRepository;
    private final KnowledgeChunkRepository chunkRepository;
    private final KnowledgeChunker chunker;
    private final EmbeddingProvider embeddingProvider;
    private final ResourceLoader resourceLoader;
    private final JdbcTemplate jdbcTemplate;

    public RagIngestionService(
            AiProperties properties,
            KnowledgeDocumentRepository documentRepository,
            KnowledgeChunkRepository chunkRepository,
            KnowledgeChunker chunker,
            @Qualifier("geminiEmbeddingProvider") EmbeddingProvider geminiProvider,
            @Qualifier("mockEmbeddingProvider") EmbeddingProvider mockProvider,
            ResourceLoader resourceLoader,
            JdbcTemplate jdbcTemplate) {
        this.properties = properties;
        this.documentRepository = documentRepository;
        this.chunkRepository = chunkRepository;
        this.chunker = chunker;
        this.resourceLoader = resourceLoader;
        this.jdbcTemplate = jdbcTemplate;

        // Choose provider based on configuration
        String configuredProvider = properties.getRag().getEmbeddingProvider();
        if ("mock".equalsIgnoreCase(configuredProvider) || properties.getGemini().getApiKey().isBlank()) {
            this.embeddingProvider = mockProvider;
            log.info("RagIngestionService: Using MockEmbeddingProvider (key blank or mock configured)");
        } else {
            this.embeddingProvider = geminiProvider;
            log.info("RagIngestionService: Using GeminiEmbeddingProvider");
        }
    }

    @Transactional
    public IngestionResult ingestAll() {
        if (!properties.getRag().isEnabled()) {
            log.info("RagIngestionService: RAG is disabled in configuration. Skipping ingestion.");
            return new IngestionResult(0, 0, 0, 0);
        }

        log.info("RagIngestionService: Starting RAG knowledge corpus ingestion...");
        ManifestData manifest = loadManifest();
        if (manifest == null || manifest.getDocuments() == null || manifest.getDocuments().isEmpty()) {
            log.warn("RagIngestionService: No documents found in manifest");
            return new IngestionResult(0, 0, 0, 0);
        }

        int ingestedDocs = 0;
        int skippedDocs = 0;
        int updatedDocs = 0;
        int totalChunks = 0;

        for (ManifestDoc entry : manifest.getDocuments()) {
            // 1. Security & Validation checks
            if (!validateEntry(entry)) {
                log.warn("RagIngestionService: Rejecting invalid manifest entry: {}", entry.getSlug());
                continue;
            }

            // 2. Read document content from classpath
            String content = loadResourceContent("classpath:knowledge/" + entry.getFile());
            if (content == null || content.isBlank()) {
                log.warn("RagIngestionService: Empty or missing content for file: {}", entry.getFile());
                continue;
            }

            // Check for sensitive tokens in document text
            if (containsSensitiveContent(content)) {
                log.error("RagIngestionService: Security violation: sensitive keyword found in file: {}", entry.getFile());
                continue;
            }

            String docHash = KnowledgeChunker.computeSha256(content);

            // 3. Check existing document
            Optional<KnowledgeDocumentEntity> existingOpt = documentRepository.findBySlug(entry.getSlug());
            if (existingOpt.isPresent()) {
                KnowledgeDocumentEntity existing = existingOpt.get();
                long chunkCount = chunkRepository.countByDocumentId(existing.getId());
                if (docHash.equals(existing.getContentHash()) && "ACTIVE".equals(existing.getStatus()) && chunkCount > 0) {
                    log.info("RagIngestionService: Document '{}' is unchanged and active ({} chunks). Skipping re-embedding.",
                            entry.getSlug(), chunkCount);
                    skippedDocs++;
                    totalChunks += chunkCount;
                    continue;
                }

                // Document modified: remove old chunks and re-embed
                log.info("RagIngestionService: Document '{}' modified or missing chunks. Updating...", entry.getSlug());
                chunkRepository.deleteByDocumentId(existing.getId());

                existing.setTitle(entry.getTitle());
                existing.setSourceType(entry.getCategory());
                existing.setPublicReference(entry.getReference());
                existing.setContentHash(docHash);
                existing.setVersion(existing.getVersion() + 1);
                existing.setStatus("ACTIVE");
                existing.setSourceName(entry.getFile());
                existing.setUpdatedAt(Instant.now());
                documentRepository.saveAndFlush(existing);

                int chunksCreated = chunkAndEmbed(existing.getId(), content);
                totalChunks += chunksCreated;
                updatedDocs++;
            } else {
                // New document
                log.info("RagIngestionService: Ingesting new document '{}'...", entry.getSlug());
                KnowledgeDocumentEntity newDoc = KnowledgeDocumentEntity.builder()
                        .id(UUID.randomUUID())
                        .publicReference(entry.getReference())
                        .slug(entry.getSlug())
                        .title(entry.getTitle())
                        .sourceType(entry.getCategory())
                        .language(entry.getLanguage() != null ? entry.getLanguage() : "fr")
                        .contentHash(docHash)
                        .version(1)
                        .status("ACTIVE")
                        .sourceName(entry.getFile())
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
                documentRepository.saveAndFlush(newDoc);

                int chunksCreated = chunkAndEmbed(newDoc.getId(), content);
                totalChunks += chunksCreated;
                ingestedDocs++;
            }
        }

        log.info("RagIngestionService: Finished ingestion: new={}, updated={}, skipped={}, totalActiveChunks={}",
                ingestedDocs, updatedDocs, skippedDocs, totalChunks);
        return new IngestionResult(ingestedDocs, updatedDocs, skippedDocs, totalChunks);
    }

    private int chunkAndEmbed(UUID documentId, String content) {
        List<KnowledgeChunker.RawChunk> rawChunks = chunker.chunkDocument(content);
        if (rawChunks.isEmpty()) {
            return 0;
        }

        for (KnowledgeChunker.RawChunk rc : rawChunks) {
            float[] vector = embeddingProvider.embed(rc.content());
            String pgVectorStr = VectorUtils.toPgVectorString(vector);

            UUID chunkId = UUID.randomUUID();
            Instant now = Instant.now();

            jdbcTemplate.update("""
                INSERT INTO ai.knowledge_chunks (id, document_id, chunk_index, section_title, content, content_hash, token_count, embedding, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS ai.vector), CAST(? AS jsonb), ?)
                """,
                    chunkId,
                    documentId,
                    rc.chunkIndex(),
                    rc.sectionTitle(),
                    rc.content(),
                    rc.contentHash(),
                    rc.content().length() / 4, // estimate tokens
                    pgVectorStr,
                    "{}",
                    Timestamp.from(now)
            );
        }

        return rawChunks.size();
    }

    private boolean validateEntry(ManifestDoc doc) {
        if (doc.getReference() == null || doc.getSlug() == null || doc.getTitle() == null || doc.getFile() == null) {
            return false;
        }
        if (!ALLOWED_CATEGORIES.contains(doc.getCategory())) {
            return false;
        }
        String file = doc.getFile().toLowerCase();
        for (String kw : SENSITIVE_KEYWORDS) {
            if (file.contains(kw)) {
                return false;
            }
        }
        return file.endsWith(".md") || file.endsWith(".txt");
    }

    private boolean containsSensitiveContent(String content) {
        String lower = content.toLowerCase();
        return lower.contains("private_key") || lower.contains("api_key=") || lower.contains("client_secret=");
    }

    private ManifestData loadManifest() {
        try {
            Resource resource = resourceLoader.getResource("classpath:knowledge/manifest.yml");
            if (!resource.exists()) {
                log.warn("RagIngestionService: knowledge/manifest.yml not found on classpath");
                return null;
            }
            try (InputStream is = resource.getInputStream()) {
                ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
                return yamlMapper.readValue(is, ManifestData.class);
            }
        } catch (Exception e) {
            log.error("RagIngestionService: Failed to parse manifest.yml: {}", e.getMessage());
            return null;
        }
    }

    private String loadResourceContent(String location) {
        try {
            Resource res = resourceLoader.getResource(location);
            if (!res.exists()) {
                return null;
            }
            try (InputStream is = res.getInputStream()) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.error("RagIngestionService: Error reading resource '{}': {}", location, e.getMessage());
            return null;
        }
    }

    public record IngestionResult(int newDocs, int updatedDocs, int skippedDocs, int totalChunks) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ManifestData {
        private int version;
        private List<ManifestDoc> documents;

        public int getVersion() { return version; }
        public void setVersion(int version) { this.version = version; }
        public List<ManifestDoc> getDocuments() { return documents; }
        public void setDocuments(List<ManifestDoc> documents) { this.documents = documents; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ManifestDoc {
        private String reference;
        private String slug;
        private String title;
        private String category;
        private String language;
        private String file;

        public String getReference() { return reference; }
        public void setReference(String reference) { this.reference = reference; }
        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }
        public String getFile() { return file; }
        public void setFile(String file) { this.file = file; }
    }
}
