-- ====================================================================
-- Yuding V2 - Migration V26: Smart Trip Planner & Multimodal Attachments
-- Logical Schema: ai
-- Authority: Flyway
-- ====================================================================

-- 1. Trip Plans Table
CREATE TABLE IF NOT EXISTS ai.trip_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(32) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    travelers INT NOT NULL DEFAULT 1,
    budget NUMERIC(12, 2) NOT NULL,
    budget_currency VARCHAR(3) NOT NULL DEFAULT 'MAD',
    priced_total NUMERIC(12, 2),
    remaining_budget NUMERIC(12, 2),
    unpriced_items_count INT NOT NULL DEFAULT 0,
    budget_status VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    preferences TEXT,
    weather_summary TEXT,
    data_freshness VARCHAR(50) NOT NULL DEFAULT 'FRESH',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_trip_plans_budget CHECK (budget > 0),
    CONSTRAINT chk_trip_plans_dates CHECK (start_date <= end_date),
    CONSTRAINT chk_trip_plans_travelers CHECK (travelers >= 1),
    CONSTRAINT chk_trip_plans_budget_status CHECK (budget_status IN ('WITHIN_BUDGET', 'OVER_BUDGET', 'PARTIALLY_PRICED'))
);

CREATE INDEX IF NOT EXISTS idx_trip_plans_user ON ai.trip_plans (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_plans_public_ref ON ai.trip_plans (public_reference);

-- 2. Trip Plan Days Table
CREATE TABLE IF NOT EXISTS ai.trip_plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_plan_id UUID NOT NULL REFERENCES ai.trip_plans(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    day_date DATE NOT NULL,
    theme VARCHAR(150),
    weather_forecast TEXT,
    estimated_cost NUMERIC(12, 2),
    morning_activities TEXT,
    afternoon_activities TEXT,
    evening_activities TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_trip_plan_day UNIQUE (trip_plan_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_trip_plan_days_plan_id ON ai.trip_plan_days (trip_plan_id, day_number);

-- 3. Trip Plan Items Table
CREATE TABLE IF NOT EXISTS ai.trip_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_plan_id UUID NOT NULL REFERENCES ai.trip_plans(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    provider VARCHAR(50),
    offer_reference VARCHAR(150),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    price NUMERIC(12, 2),
    currency VARCHAR(3),
    price_in_budget_currency NUMERIC(12, 2),
    is_priced BOOLEAN NOT NULL DEFAULT true,
    day_number INT,
    slot VARCHAR(20),
    details_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_trip_plan_items_type CHECK (item_type IN ('FLIGHT', 'HOTEL', 'ACTIVITY', 'TRANSFER'))
);

CREATE INDEX IF NOT EXISTS idx_trip_plan_items_plan_id ON ai.trip_plan_items (trip_plan_id);

-- 4. Conversation Attachments Table
CREATE TABLE IF NOT EXISTS ai.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(32) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    kind VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_attachments_kind CHECK (kind IN ('IMAGE', 'DOCUMENT')),
    CONSTRAINT chk_attachments_status CHECK (status IN ('UPLOADED', 'PROCESSED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_attachments_user_conv ON ai.attachments (user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_attachments_public_ref ON ai.attachments (public_reference);

-- 5. Message Attachments Association Table
CREATE TABLE IF NOT EXISTS ai.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES ai.messages(id) ON DELETE CASCADE,
    attachment_id UUID NOT NULL REFERENCES ai.attachments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_message_attachment UNIQUE (message_id, attachment_id)
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_msg ON ai.message_attachments (message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_att ON ai.message_attachments (attachment_id);
