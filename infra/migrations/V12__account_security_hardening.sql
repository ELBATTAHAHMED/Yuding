-- ====================================================================
-- Yuding V2 Database Migration V12: Account & Session Security Hardening
-- ====================================================================

-- 1. Add session tracking and metadata columns to identity.refresh_tokens
ALTER TABLE identity.refresh_tokens
    ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS user_agent VARCHAR(512),
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS revocation_reason VARCHAR(64);

-- Populate session_id for any existing rows where it might be null
UPDATE identity.refresh_tokens SET session_id = id WHERE session_id IS NULL;

-- Enforce NOT NULL for session_id
ALTER TABLE identity.refresh_tokens ALTER COLUMN session_id SET NOT NULL;

-- Indexes for fast session lookups and active session filtering
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON identity.refresh_tokens (user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_session ON identity.refresh_tokens (user_id, revoked_at, expires_at);

-- 2. Enhance audit.security_events with session correlation and user indexing
ALTER TABLE audit.security_events
    ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON audit.security_events (user_id, created_at DESC);
