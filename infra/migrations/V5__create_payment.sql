-- ====================================================================
-- Yuding V2 Database Migration V5: Payment Schema Tables
-- ====================================================================

-- 1. Payments Table
CREATE TABLE IF NOT EXISTS payment.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL, -- Logical reference to booking.bookings(id)
    payment_reference VARCHAR(32) NOT NULL UNIQUE,
    provider_name VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255) UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(24) NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
    payment_method_type VARCHAR(32),
    client_token VARCHAR(255),
    error_message TEXT,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payment.payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment.payments (status);

-- 2. Payment Events Table (Webhook Event Ledger)
CREATE TABLE IF NOT EXISTS payment.payment_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id UUID REFERENCES payment.payments(id) ON DELETE SET NULL,
    provider_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    event_payload JSONB NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PROCESSED', 'IGNORED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON payment.payment_events (payment_id);

-- 3. Refunds Table
CREATE TABLE IF NOT EXISTS payment.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payment.payments(id) ON DELETE RESTRICT,
    booking_id UUID NOT NULL, -- Logical reference to booking.bookings(id)
    refund_reference VARCHAR(32) NOT NULL UNIQUE,
    provider_refund_id VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    reason TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED')),
    requested_by UUID NOT NULL, -- Logical reference to identity user/admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON payment.refunds (payment_id);

-- 4. Idempotency Keys Table
CREATE TABLE IF NOT EXISTS payment.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_payload JSONB,
    status_code INT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON payment.idempotency_keys (expires_at);
