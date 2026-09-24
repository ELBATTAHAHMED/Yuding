-- ====================================================================
-- Yuding V2 Database Migration V24: AI Durable Conversations & Context
-- ====================================================================

-- 1. Hardening ai.conversations for Phase 46
ALTER TABLE ai.conversations ALTER COLUMN session_token DROP NOT NULL;
ALTER TABLE ai.conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE ai.conversations ALTER COLUMN title TYPE VARCHAR(255);
ALTER TABLE ai.conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE ai.conversations ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS ai.idx_ai_conversations_user;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user 
    ON ai.conversations (user_id, last_message_at DESC NULLS LAST);

-- 2. Aligning ai.messages
ALTER TABLE ai.messages DROP CONSTRAINT IF EXISTS messages_sender_role_check;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'ai' AND table_name = 'messages' AND column_name = 'sender_role'
    ) THEN
        ALTER TABLE ai.messages RENAME COLUMN sender_role TO role;
    END IF;
END $$;

ALTER TABLE ai.messages ADD CONSTRAINT messages_role_check 
    CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL'));

ALTER TABLE ai.messages ADD COLUMN IF NOT EXISTS grounded BOOLEAN DEFAULT FALSE;
ALTER TABLE ai.messages ADD COLUMN IF NOT EXISTS provider VARCHAR(64);
ALTER TABLE ai.messages ADD COLUMN IF NOT EXISTS model VARCHAR(64);
ALTER TABLE ai.messages ADD COLUMN IF NOT EXISTS tool_count INTEGER DEFAULT 0;
ALTER TABLE ai.messages ADD COLUMN IF NOT EXISTS sequence_number INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS ai.idx_ai_messages_conv;
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv 
    ON ai.messages (conversation_id, sequence_number ASC, created_at ASC);

-- 3. Dedicated ai.tool_calls table for semantic tool executions
CREATE TABLE IF NOT EXISTS ai.tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
    assistant_message_id UUID REFERENCES ai.messages(id) ON DELETE SET NULL,
    tool_name VARCHAR(64) NOT NULL,
    tool_call_id VARCHAR(128),
    arguments_json JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    result_summary_json JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_conv 
    ON ai.tool_calls (conversation_id, created_at ASC);
