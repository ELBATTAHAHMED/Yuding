-- =============================================================================
-- Migration V18: Payment Provider Abstraction & PayPal Sandbox Checkout (Phase 38)
-- Schema: payment
-- Enhances payment schema with pricing quote binding, provider order tracking, and indexing.
-- =============================================================================

ALTER TABLE payment.payments
    ADD COLUMN IF NOT EXISTS pricing_quote_id UUID,
    ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS approval_url TEXT;

-- Foreign key linking payment to authoritative server pricing quote
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_pricing_quote'
    ) THEN
        ALTER TABLE payment.payments
            ADD CONSTRAINT fk_payments_pricing_quote
            FOREIGN KEY (pricing_quote_id)
            REFERENCES booking.server_pricing_quotes(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_payments_pricing_quote_id ON payment.payments (pricing_quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON payment.payments (provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_created_at ON payment.payments (booking_id, created_at DESC);
