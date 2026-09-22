-- =============================================================================
-- Migration V19: Expand Provider Offer ID Capacity
-- Schema: booking
-- Allows provider offer IDs of arbitrary length (e.g. NUITEE base64 tokens).
-- =============================================================================

ALTER TABLE booking.offer_snapshots
    ALTER COLUMN provider_offer_id TYPE TEXT;

ALTER TABLE booking.offer_revalidations
    ALTER COLUMN provider_offer_id TYPE TEXT,
    ALTER COLUMN matched_provider_offer_id TYPE TEXT;
