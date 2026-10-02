-- One durable cancellation operation per booking. Provider calls are made only after
-- PROCESSING has committed; the row is the idempotency and recovery ledger.
CREATE TABLE booking.cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES booking.bookings(id) ON DELETE RESTRICT,
    requested_by UUID NOT NULL,
    reason VARCHAR(500),
    status VARCHAR(24) NOT NULL CHECK (status IN ('PROCESSING', 'CANCELLED', 'PROVIDER_FAILED')),
    policy_type VARCHAR(24) NOT NULL CHECK (policy_type IN ('FULL', 'PARTIAL', 'NON_REFUNDABLE', 'NOT_APPLICABLE')),
    policy_source VARCHAR(64) NOT NULL,
    policy_reason VARCHAR(500) NOT NULL,
    policy_deadline TIMESTAMPTZ,
    provider_name VARCHAR(64),
    provider_cancellation_reference VARCHAR(100),
    provider_status VARCHAR(40),
    failure_message VARCHAR(500),
    refund_status VARCHAR(24) NOT NULL CHECK (refund_status IN ('NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'REFUNDED', 'REFUND_FAILED')),
    refund_amount NUMERIC(12,2),
    cancellation_fee NUMERIC(12,2),
    currency VARCHAR(3),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT cancellation_money_nonnegative CHECK (
        (refund_amount IS NULL OR refund_amount >= 0) AND
        (cancellation_fee IS NULL OR cancellation_fee >= 0)
    )
);

CREATE INDEX idx_cancellation_requests_requested_by ON booking.cancellation_requests(requested_by, requested_at DESC);
CREATE UNIQUE INDEX uq_refunds_booking ON payment.refunds(booking_id);
