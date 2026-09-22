-- =============================================================================
-- Migration V21: End-to-End Idempotency & Duplicate-Side-Effect Protection (Phase 41)
-- Schema: booking, payment
-- Provides persistent storage for client idempotency keys, request fingerprints,
-- and provider resource uniqueness guarantees.
-- =============================================================================

-- 1. Create booking.idempotency_records
CREATE TABLE IF NOT EXISTS booking.idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    operation VARCHAR(50) NOT NULL,
    resource_scope VARCHAR(100),
    idempotency_key_hash VARCHAR(64) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL,
    resource_type VARCHAR(50),
    resource_reference VARCHAR(100),
    http_status INTEGER,
    response_payload JSONB,
    response_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_idempotency_scope UNIQUE (actor_user_id, operation, idempotency_key_hash)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup 
    ON booking.idempotency_records (actor_user_id, operation, idempotency_key_hash);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at 
    ON booking.idempotency_records (expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_resource 
    ON booking.idempotency_records (resource_type, resource_reference);

-- 2. Enforce uniqueness on provider identifiers in payment.payments (scoped by provider)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_order 
    ON payment.payments (provider_name, provider_order_id) 
    WHERE provider_order_id IS NOT NULL;

-- In case payment.payments(provider_transaction_id) already had a global unique constraint,
-- ensure scoped index also exists if needed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_tx 
    ON payment.payments (provider_name, provider_transaction_id) 
    WHERE provider_transaction_id IS NOT NULL;

-- 3. Add provider_request_id column to payment.payments if not present
ALTER TABLE payment.payments 
    ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_payments_provider_request_id 
    ON payment.payments (provider_request_id);
