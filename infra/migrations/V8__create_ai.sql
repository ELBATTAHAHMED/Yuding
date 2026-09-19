-- ====================================================================
-- Yuding V2 Database Migration V8: AI Schema Tables
-- ====================================================================

-- 1. Conversations Table
CREATE TABLE IF NOT EXISTS ai.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Logical reference to identity.users(id)
    session_token VARCHAR(64) NOT NULL,
    title VARCHAR(150),
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED')),
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai.conversations (user_id, session_token);

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS ai.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL')),
    content TEXT,
    tool_calls_json JSONB,
    tool_call_id VARCHAR(64),
    tokens_used INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai.messages (conversation_id, created_at);

-- 3. Documents Table
CREATE TABLE IF NOT EXISTS ai.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    source_url VARCHAR(512),
    document_type VARCHAR(32) NOT NULL CHECK (document_type IN ('DESTINATION_GUIDE', 'HOTEL_AMENITY', 'TRAVEL_TIPS')),
    content_hash VARCHAR(64) NOT NULL UNIQUE,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Document Chunks Table
CREATE TABLE IF NOT EXISTS ai.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ai.documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON ai.document_chunks (document_id, chunk_index);

-- 5. Embeddings Table (pgvector with HNSW index)
CREATE TABLE IF NOT EXISTS ai.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES ai.document_chunks(id) ON DELETE CASCADE,
    embedding ai.vector(1536) NOT NULL,
    model_name VARCHAR(50) NOT NULL DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_embeddings_vector 
ON ai.embeddings 
USING hnsw (embedding ai.vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- 6. Tool Call Logs Table
CREATE TABLE IF NOT EXISTS ai.tool_call_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES ai.messages(id) ON DELETE SET NULL,
    tool_name VARCHAR(100) NOT NULL,
    arguments_json JSONB NOT NULL,
    result_json JSONB,
    execution_time_ms INT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'TIMEOUT', 'ERROR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_call_logs_conv ON ai.tool_call_logs (conversation_id, created_at);
