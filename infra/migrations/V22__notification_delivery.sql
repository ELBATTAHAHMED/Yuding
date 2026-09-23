-- ====================================================================
-- Yuding V2 Database Migration V22: Notification Delivery & Idempotency
-- Schema: notification
-- ====================================================================

-- 1. Alter notification.notifications to add V2 delivery lifecycle & idempotency fields
ALTER TABLE notification.notifications
    ADD COLUMN IF NOT EXISTS notification_reference VARCHAR(12),
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS template_name VARCHAR(64),
    ADD COLUMN IF NOT EXISTS template_version VARCHAR(16) DEFAULT 'v1',
    ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(32),
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(32),
    ADD COLUMN IF NOT EXISTS idempotency_key_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_error_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 2. Drop old status check constraint and apply V2 notification lifecycle
ALTER TABLE notification.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE notification.notifications
    ADD CONSTRAINT chk_notifications_status
    CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'RETRY_SCHEDULED', 'FAILED_PERMANENT', 'QUEUED', 'FAILED'));

-- Set default status to PENDING for new V2 records
ALTER TABLE notification.notifications ALTER COLUMN status SET DEFAULT 'PENDING';

-- 3. Idempotency and reference constraints
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_reference
    ON notification.notifications (notification_reference)
    WHERE notification_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_event_idempotency
    ON notification.notifications (event_type, idempotency_key_hash)
    WHERE event_type IS NOT NULL AND idempotency_key_hash IS NOT NULL;

-- 4. Worker claiming index (status + next_attempt_at)
CREATE INDEX IF NOT EXISTS idx_notifications_worker_claim
    ON notification.notifications (status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_notifications_booking_ref
    ON notification.notifications (booking_reference)
    WHERE booking_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_payment_ref
    ON notification.notifications (payment_reference)
    WHERE payment_reference IS NOT NULL;

-- 5. Delivery attempts adjustments
ALTER TABLE notification.delivery_attempts DROP CONSTRAINT IF EXISTS delivery_attempts_status_check;
ALTER TABLE notification.delivery_attempts
    ADD CONSTRAINT chk_delivery_attempts_status
    CHECK (status IN ('SUCCESS', 'TEMPORARY_FAILURE', 'PERMANENT_FAILURE'));
