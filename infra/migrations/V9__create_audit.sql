-- ====================================================================
-- Yuding V2 Database Migration V9: Audit Schema Tables
-- ====================================================================

-- 1. Audit Events Table
CREATE TABLE IF NOT EXISTS audit.audit_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    user_id UUID, -- Logical reference to identity.users(id)
    client_ip VARCHAR(45),
    user_agent TEXT,
    entity_type VARCHAR(50),
    entity_id VARCHAR(64),
    old_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit.audit_events (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit.audit_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user ON audit.audit_events (user_id, created_at);

-- 2. Admin Actions Table
CREATE TABLE IF NOT EXISTS audit.admin_actions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_user_id UUID NOT NULL, -- Logical reference to identity.users(id)
    action_type VARCHAR(100) NOT NULL,
    target_service VARCHAR(50) NOT NULL,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id VARCHAR(64) NOT NULL,
    reason TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON audit.admin_actions (admin_user_id, created_at);

-- 3. Security Events Table
CREATE TABLE IF NOT EXISTS audit.security_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID, -- Logical reference to identity.users(id)
    email VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    failure_reason VARCHAR(255),
    risk_score INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_ip ON audit.security_events (ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_email ON audit.security_events (email, created_at);
