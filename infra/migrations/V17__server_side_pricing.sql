-- =============================================================================
-- Migration V17: Add Server Pricing Quotes Table (Phase 37)
-- Schema: booking
-- Provides server-authoritative persistence for finalized booking pricing quotes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking.server_pricing_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    offer_snapshot_id UUID NOT NULL,
    revalidation_id UUID NOT NULL,
    product_type VARCHAR(32) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    pricing_status VARCHAR(32) NOT NULL,
    base_amount NUMERIC(12, 2),
    tax_amount NUMERIC(12, 2),
    fee_amount NUMERIC(12, 2),
    total_amount NUMERIC(12, 2),
    currency VARCHAR(3),
    breakdown_complete BOOLEAN NOT NULL DEFAULT false,
    priced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL,
    pricing_hash VARCHAR(64) NOT NULL,
    version INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_server_pricing_booking
        FOREIGN KEY (booking_id)
        REFERENCES booking.bookings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_server_pricing_snapshot
        FOREIGN KEY (offer_snapshot_id)
        REFERENCES booking.offer_snapshots(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_server_pricing_revalidation
        FOREIGN KEY (revalidation_id)
        REFERENCES booking.offer_revalidations(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_server_pricing_revalidation_id
        UNIQUE (revalidation_id),

    CONSTRAINT chk_server_pricing_product_type
        CHECK (product_type IN ('FLIGHT', 'HOTEL', 'ACTIVITY', 'TRANSFER', 'TRAIN')),

    CONSTRAINT chk_server_pricing_status
        CHECK (pricing_status IN ('PRICED', 'NOT_PRICED', 'NOT_APPLICABLE')),

    CONSTRAINT chk_server_pricing_currency
        CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),

    CONSTRAINT chk_server_pricing_hash_len
        CHECK (length(pricing_hash) = 64)
);

CREATE INDEX idx_server_pricing_booking_id ON booking.server_pricing_quotes(booking_id);
CREATE INDEX idx_server_pricing_revalidation_id ON booking.server_pricing_quotes(revalidation_id);
CREATE INDEX idx_server_pricing_priced_at ON booking.server_pricing_quotes(booking_id, priced_at DESC);
