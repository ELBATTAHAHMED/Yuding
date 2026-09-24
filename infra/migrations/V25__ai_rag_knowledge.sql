-- ====================================================================
-- Yuding V2 Database Migration V25: AI RAG Knowledge with pgvector
-- ====================================================================

-- 1. Knowledge Documents Table
CREATE TABLE IF NOT EXISTS ai.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(64) NOT NULL UNIQUE,
    source_type VARCHAR(64) NOT NULL CHECK (source_type IN ('FAQ', 'YUDING_POLICY', 'CANCELLATION_POLICY', 'DESTINATION_INFO', 'SUPPORT', 'TRAVEL_GUIDE')),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL UNIQUE,
    language VARCHAR(10) NOT NULL DEFAULT 'fr',
    content_hash VARCHAR(64) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DRAFT')),
    source_name VARCHAR(128) NOT NULL,
    source_uri VARCHAR(512),
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_type 
    ON ai.knowledge_documents (source_type, status);

-- 2. Knowledge Chunks Table with 768-dim Vector & HNSW Index
CREATE TABLE IF NOT EXISTS ai.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ai.knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    section_title VARCHAR(255),
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    token_count INTEGER,
    embedding ai.vector(768) NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc 
    ON ai.knowledge_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_vector 
    ON ai.knowledge_chunks 
    USING hnsw (embedding ai.vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

-- 3. Message Sources Table (Provenance & Citations)
CREATE TABLE IF NOT EXISTS ai.message_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES ai.messages(id) ON DELETE CASCADE,
    document_id UUID REFERENCES ai.knowledge_documents(id) ON DELETE SET NULL,
    chunk_id UUID REFERENCES ai.knowledge_chunks(id) ON DELETE SET NULL,
    document_reference VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    section_title VARCHAR(255),
    category VARCHAR(64) NOT NULL,
    similarity_score NUMERIC(5, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_sources_msg 
    ON ai.message_sources (message_id);
