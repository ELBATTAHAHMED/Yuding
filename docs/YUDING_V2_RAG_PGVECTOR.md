# Yuding V2 — Phase 47: Retrieval-Augmented Generation (RAG) & pgvector

## 1. Overview & Architectural Principles

Phase 47 introduces a production-ready **Retrieval-Augmented Generation (RAG)** layer to Yuding Assistant, backed by PostgreSQL's `pgvector` extension in the logical schema `ai`.

### 1.1 Strict Separation of Concerns
A foundational invariant of Yuding V2 is the absolute architectural demarcation between **static / semi-static knowledge** and **live transactional data**:

```
+-----------------------------------------------------------------------------------+
|                                  Yuding Assistant                                 |
+-----------------------------------------------------------------------------------+
                       |                                     |
                       v                                     v
+---------------------------------------------+   +---------------------------------+
|               RAG Knowledge                 |   |        Live Tools (Phase 45)    |
| (pgvector / Cosine Distance <= 0.35)        |   | (Provider Adapters & DB)        |
+---------------------------------------------+   +---------------------------------+
| - Travel guides (Marrakech, Paris)          |   | - Flight search & live prices   |
| - Platform FAQ & sandbox guidance           |   | - Hotel availability & rates    |
| - Booking & payment policies                |   | - Activity offers & bookings    |
| - Cancellation & refund rules               |   | - Transfer options & pricing    |
| - Customer support & emergency procedures   |   | - Live weather & forecasts      |
|                                             |   | - Live currency exchange rates  |
|                                             |   | - Authenticated booking status  |
+---------------------------------------------+   +---------------------------------+
```

- **RAG scope**: Strictly static documentation, policies, destination advice, and FAQs.
- **Tool scope**: Live provider data, inventory, real-time rates, and transactional lookups.
- **Rule**: Historical tool results or dynamic prices are **never** embedded or ingested into RAG.
- **Zero Transactional AI**: The assistant never initiates or confirms bookings, cancellations, or payments directly.

---

## 2. PostgreSQL `pgvector` Schema Design

Flyway migration `V25__ai_rag_knowledge.sql` establishes the schema in `ai`:

### 2.1 Extension & Documents Table
```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ai;

CREATE TABLE ai.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(64) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(60) NOT NULL,
    source_type VARCHAR(60) NOT NULL DEFAULT 'SYSTEM_CANONICAL',
    language VARCHAR(10) NOT NULL DEFAULT 'fr',
    version INT NOT NULL DEFAULT 1,
    content_hash VARCHAR(64) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_doc_source_type CHECK (source_type IN (
        'SYSTEM_CANONICAL', 'MANUAL_IMPORT', 'SYSTEM_FAQ', 'SYSTEM_POLICY'
    ))
);
```

### 2.2 Knowledge Chunks Table & HNSW Vector Index
```sql
CREATE TABLE ai.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ai.knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    section_heading VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    token_count INT NOT NULL DEFAULT 0,
    embedding ai.vector(768) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doc_chunk_index UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_knowledge_chunks_embedding
    ON ai.knowledge_chunks
    USING hnsw (embedding ai.vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

### 2.3 Citation & Provenance Tracking
```sql
CREATE TABLE ai.message_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES ai.conversation_messages(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES ai.knowledge_chunks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_message_chunk UNIQUE (message_id, chunk_id)
);
```

---

## 3. Knowledge Corpus & Manifest

The canonical knowledge corpus is located in `backend/ai-service/src/main/resources/knowledge/`:
- `manifest.yml`: Master manifest defining all document metadata, unique references, slugs, categories, and relative paths.
- `faq/platform_faq.md` (`DOC-FAQ-001`, category `FAQ`): Overview of Yuding, sandbox testing, accepted payment methods, and account security.
- `policies/booking_payment_policy.md` (`DOC-POL-001`, category `YUDING_POLICY`): Confirmation timelines, voucher issuance, price guarantees, and payment security.
- `policies/cancellation_policy.md` (`DOC-CAN-001`, category `CANCELLATION_POLICY`): Tiered cancellation policies, refund processing (5-10 business days), and non-refundable categories.
- `destinations/marrakech_guide.md` (`DOC-DST-001`, category `DESTINATION_INFO`): Seasonal climate, Medina neighborhoods, cultural etiquette, and transport advice.
- `destinations/paris_guide.md` (`DOC-DST-002`, category `DESTINATION_INFO`): Best travel periods, public transport (Metro/Navigo), and major cultural landmarks.
- `support/support_guide.md` (`DOC-SUP-001`, category `SUPPORT`): Customer support channels, 24/7 emergency hotline, and dispute resolution SLA.

---

## 4. Ingestion & Embedding Pipeline

1. **Semantic Markdown Chunking (`KnowledgeChunker`)**:
   - Parses markdown by primary and secondary section headings (`#`, `##`, `###`).
   - Paragraph chunks bounded to ~900 characters to optimize dense retrieval relevance.
   - Computes SHA-256 chunk hash for idempotency.
2. **Deterministic & Provider Embeddings (`EmbeddingProvider`)**:
   - `GeminiEmbeddingProvider`: Generates 768-dimensional normalized vectors via Google Gemini's `v1beta/models/gemini-embedding-001:embedContent`.
   - `MockEmbeddingProvider`: Produces deterministic 768-dimensional unit vectors for the 100% offline unit/integration test suite.
3. **Idempotent Ingestion Runner (`RagStartupRunner` & `RagIngestionService`)**:
   - Runs automatically on application startup.
   - Computes document content hash: if unchanged and active, skips re-embedding automatically.
   - Initial ingestion: 6 canonical documents, 22 vector chunks. Subsequent startups: 0 new, 6 skipped.

---

## 5. Knowledge Tool & Semantic Search

### 5.1 `searchKnowledge` Tool
Registered in `AiToolRegistry` with parameters:
- `query` (required): Natural language query describing the policy or guide topic.
- `category` (optional): Filter by category (`FAQ`, `YUDING_POLICY`, `CANCELLATION_POLICY`, `DESTINATION_INFO`, `SUPPORT`).

### 5.2 Cosine Distance Query
Vector search uses native PostgreSQL SQL with schema-qualified cosine distance:
```sql
SELECT c.id, c.document_id, c.chunk_index, c.section_heading, c.content, c.token_count,
       d.title, d.category, d.public_reference,
       (c.embedding OPERATOR(ai.<=>) CAST(:queryVector AS ai.vector)) AS distance
FROM ai.knowledge_chunks c
JOIN ai.knowledge_documents d ON c.document_id = d.id
WHERE d.active = true
  AND (c.embedding OPERATOR(ai.<=>) CAST(:queryVector AS ai.vector)) <= :threshold
ORDER BY distance ASC
LIMIT :limit
```
- Configured threshold: `0.35` (cosine distance). If no chunk meets this threshold, returns empty results rather than hallucinated matches.
- Strict token context budget: Maximum 600 tokens returned per search.

---

## 6. Grounding Classification & Provenance

When an assistant message is generated, `AiChatService` dynamically determines its `groundingType`:
- `NONE`: No tools called.
- `LIVE`: Live tools invoked (e.g., `getWeather`, `searchFlights`).
- `RAG`: Only `searchKnowledge` invoked, with verified citations.
- `MIXED`: Both live tools and RAG knowledge invoked in the same turn.

Citations are persisted in `ai.message_sources` and exposed via API DTO `sources`:
```typescript
interface AiSourceDto {
  reference: string;
  title: string;
  section: string;
  category: string;
}
```

---

## 7. Frontend Grounding & Provenance UI

In `frontend/web/src/components/chat/AiChatWidget.tsx`:
- **Badge Indication**:
  - `RAG`: "Source Yuding"
  - `LIVE`: "Données Yuding vérifiées"
  - `MIXED`: "Sources Yuding + données vérifiées"
- **Collapsible Sources List**:
  - Displays a subtle toggle when `sources.length > 0`.
  - Shows each cited document's title, section heading, and public reference tag (e.g., `DOC-CAN-001`).
- **Resilience**: Survives page refresh and conversation reloads.
