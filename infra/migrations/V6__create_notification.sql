-- ====================================================================
-- Yuding V2 Database Migration V6: Notification Schema Tables
-- ====================================================================

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS notification.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID, -- Logical reference to identity.users(id)
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(32),
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL', 'SMS', 'PUSH')),
    template_code VARCHAR(64) NOT NULL,
    subject VARCHAR(255),
    content_payload JSONB NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'SENT', 'FAILED')),
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_status_sched ON notification.notifications (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notification.notifications (recipient_user_id);

-- 2. Delivery Attempts Table
CREATE TABLE IF NOT EXISTS notification.delivery_attempts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notification.notifications(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    provider_name VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(255),
    response_payload JSONB,
    error_message TEXT,
    status VARCHAR(24) NOT NULL CHECK (status IN ('SUCCESS', 'TEMPORARY_FAILURE', 'PERMANENT_FAILURE')),
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_notif ON notification.delivery_attempts (notification_id);

-- 3. Notification Templates Table
CREATE TABLE IF NOT EXISTS notification.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL', 'SMS')),
    locale VARCHAR(8) NOT NULL DEFAULT 'en',
    subject_template TEXT,
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_notification_templates UNIQUE (code, locale, version)
);
