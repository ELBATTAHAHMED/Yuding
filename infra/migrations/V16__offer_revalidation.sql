-- =============================================================================
-- Migration V16: Add Offer Revalidations Table (Phase 36)
-- Schema: booking
-- Provides server-authoritative persistence for live offer revalidations & repricing.
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking.offer_revalidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    offer_snapshot_id UUID NOT NULL,
    provider VARCHAR(64) NOT NULL,
    product_type VARCHAR(32) NOT NULL,
    availability_status VARCHAR(32) NOT NULL,
    price_status VARCHAR(32) NOT NULL,
    snapshot_provider_amount NUMERIC(12, 2),
    snapshot_provider_currency VARCHAR(3),
    current_provider_amount NUMERIC(12, 2),
    current_provider_currency VARCHAR(3),
    provider_offer_id VARCHAR(255),
    matched_provider_offer_id VARCHAR(255),
    revalidated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL,
    provider_expires_at TIMESTAMPTZ,
    price_change_accepted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_offer_revalidations_booking
        FOREIGN KEY (booking_id)
        REFERENCES booking.bookings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_offer_revalidations_snapshot
        FOREIGN KEY (offer_snapshot_id)
        REFERENCES booking.offer_snapshots(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_revalidations_product_type
        CHECK (product_type IN ('FLIGHT', 'HOTEL', 'ACTIVITY', 'TRANSFER', 'TRAIN')),

    CONSTRAINT chk_revalidations_availability
        CHECK (availability_status IN ('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN', 'REVALIDATION_UNSUPPORTED')),

    CONSTRAINT chk_revalidations_price_status
        CHECK (price_status IN ('UNCHANGED', 'CHANGED', 'NOT_AVAILABLE', 'NOT_APPLICABLE')),

    CONSTRAINT chk_revalidations_snapshot_curr
        CHECK (snapshot_provider_currency IS NULL OR snapshot_provider_currency ~ '^[A-Z]{3}$'),

    CONSTRAINT chk_revalidations_curr_curr
        CHECK (current_provider_currency IS NULL OR current_provider_currency ~ '^[A-Z]{3}$')
);

CREATE INDEX idx_offer_revalidations_booking_id ON booking.offer_revalidations(booking_id);
CREATE INDEX idx_offer_revalidations_snapshot_id ON booking.offer_revalidations(offer_snapshot_id);
CREATE INDEX idx_offer_revalidations_revalidated_at ON booking.offer_revalidations(booking_id, revalidated_at DESC);
