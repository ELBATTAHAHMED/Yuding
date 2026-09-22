-- ====================================================================
-- Yuding V2 Database Migration V15: Immutable Offer Snapshots
-- ====================================================================

-- 1. Drop existing legacy/placeholder table if empty
DROP TABLE IF EXISTS booking.offer_snapshots CASCADE;

-- 2. Create normalized booking.offer_snapshots table
CREATE TABLE booking.offer_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    product_type VARCHAR(32) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    provider_offer_id VARCHAR(255) NOT NULL,
    selected_details JSONB NOT NULL,
    provider_amount NUMERIC(12, 2),
    provider_currency VARCHAR(3),
    display_amount NUMERIC(12, 2),
    display_currency VARCHAR(3),
    exchange_rate NUMERIC(18, 6),
    exchange_rate_date DATE,
    exchange_rate_provider VARCHAR(64),
    provider_expires_at TIMESTAMPTZ,
    snapshot_expires_at TIMESTAMPTZ NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    snapshot_hash VARCHAR(64) NOT NULL,

    -- Foreign Key constraint with CASCADE delete
    CONSTRAINT fk_offer_snapshots_booking FOREIGN KEY (booking_id)
        REFERENCES booking.bookings(id) ON DELETE CASCADE,

    -- Exactly one snapshot per Booking
    CONSTRAINT uk_offer_snapshots_booking_id UNIQUE (booking_id),

    -- Product Type validation
    CONSTRAINT chk_offer_snapshots_product_type CHECK (product_type IN ('FLIGHT', 'HOTEL', 'ACTIVITY', 'TRANSFER', 'TRAIN')),

    -- Currency consistency constraint: if provider_amount is present, provider_currency must be present
    CONSTRAINT chk_offer_snapshots_currency_coherence CHECK (
        (provider_amount IS NULL AND provider_currency IS NULL) OR
        (provider_amount IS NOT NULL AND provider_currency IS NOT NULL)
    ),

    -- Hash length constraint (SHA-256 hex string = 64 characters)
    CONSTRAINT chk_offer_snapshots_hash_len CHECK (length(snapshot_hash) = 64)
);

-- 3. Indexes for fast joins, provider lookups, and lifecycle queries
CREATE UNIQUE INDEX idx_offer_snapshots_booking_id ON booking.offer_snapshots (booking_id);
CREATE INDEX idx_offer_snapshots_provider_offer ON booking.offer_snapshots (provider, provider_offer_id);
CREATE INDEX idx_offer_snapshots_expires_at ON booking.offer_snapshots (snapshot_expires_at);
