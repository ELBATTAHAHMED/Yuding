-- ====================================================================
-- Yuding V2 Database Migration V13: Booking Lifecycle Architecture
-- ====================================================================

-- 1. Relax Phase 34/37 columns on booking.bookings (Reference & Server Pricing are decoupled from Phase 33)
ALTER TABLE booking.bookings
    ALTER COLUMN booking_reference DROP NOT NULL,
    ALTER COLUMN total_amount DROP NOT NULL,
    ALTER COLUMN currency DROP NOT NULL;

-- 2. Add product_type and status_changed_at to booking.bookings
ALTER TABLE booking.bookings
    ADD COLUMN IF NOT EXISTS product_type VARCHAR(32) NOT NULL DEFAULT 'HOTEL',
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure product_type check constraint
ALTER TABLE booking.bookings
    DROP CONSTRAINT IF EXISTS chk_bookings_product_type;

ALTER TABLE booking.bookings
    ADD CONSTRAINT chk_bookings_product_type
    CHECK (product_type IN ('FLIGHT', 'HOTEL', 'ACTIVITY', 'TRANSFER', 'TRAIN'));

-- 3. Update status check constraint on booking.bookings for all 9 Phase 33 lifecycle statuses
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'booking.bookings'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%status%'
    ) LOOP
        EXECUTE 'ALTER TABLE booking.bookings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE booking.bookings
    ADD CONSTRAINT chk_bookings_status
    CHECK (status IN (
        'DRAFT',
        'PENDING_PAYMENT',
        'PAYMENT_FAILED',
        'PAID',
        'PENDING_PROVIDER_CONFIRMATION',
        'CONFIRMED',
        'CANCELLED',
        'REFUNDED',
        'EXPIRED'
    ));

-- 4. Optimize indexing for user history queries and lifecycle status checks
CREATE INDEX IF NOT EXISTS idx_bookings_user_created ON booking.bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status_changed ON booking.bookings (status, status_changed_at DESC);
