-- =============================================================================
-- Migration V20: Trusted Payment Webhooks Ledger & Awaiting Status (Phase 40)
-- Schema: payment
-- Establishes payment.webhook_events ledger for signature-verified event
-- deduplication and reconciles Payment status transitions awaiting webhooks.
-- =============================================================================

-- 1. Create payment.webhook_events ledger
CREATE TABLE IF NOT EXISTS payment.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(64) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    provider_resource_id VARCHAR(255),
    provider_order_id VARCHAR(255),
    payment_id UUID,
    signature_verified BOOLEAN NOT NULL DEFAULT false,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
        CHECK (processing_status IN ('PENDING', 'PROCESSED', 'DUPLICATE', 'IGNORED', 'UNMATCHED', 'FAILED')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    payload_hash VARCHAR(64) NOT NULL,
    failure_reason TEXT,
    CONSTRAINT uq_webhook_events_provider_event UNIQUE (provider, provider_event_id),
    CONSTRAINT fk_webhook_events_payment FOREIGN KEY (payment_id)
        REFERENCES payment.payments(id) ON DELETE SET NULL
);

-- Indexes for efficient correlation by provider identifiers
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_order_id ON payment.webhook_events (provider_order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_resource_id ON payment.webhook_events (provider_resource_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON payment.webhook_events (payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON payment.webhook_events (received_at DESC);

-- 2. Update payment status constraint to support AWAITING_WEBHOOK lifecycle status
ALTER TABLE payment.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payment.payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('INITIATED', 'REQUIRES_ACTION', 'AWAITING_WEBHOOK', 'SUCCEEDED', 'FAILED', 'REFUNDED'));
