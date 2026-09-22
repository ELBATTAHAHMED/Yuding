-- ====================================================================
-- Yuding V2 Database Migration V14: Public Booking Reference
-- ====================================================================

-- 1. Ensure booking_reference column has sufficient capacity
ALTER TABLE booking.bookings
    ALTER COLUMN booking_reference TYPE VARCHAR(16);

-- 2. Backfill existing rows that have NULL or invalid booking_reference
DO $$
DECLARE
    r RECORD;
    chars CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    new_ref TEXT;
    i INT;
    collision BOOLEAN;
BEGIN
    FOR r IN (
        SELECT id
        FROM booking.bookings
        WHERE booking_reference IS NULL
           OR booking_reference !~ '^YUD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$'
    ) LOOP
        LOOP
            new_ref := 'YUD-';
            FOR i IN 1..8 LOOP
                new_ref := new_ref || substr(chars, floor(random() * length(chars) + 1)::int, 1);
            END LOOP;

            SELECT EXISTS(SELECT 1 FROM booking.bookings WHERE booking_reference = new_ref) INTO collision;
            IF NOT collision THEN
                EXIT;
            END IF;
        END LOOP;

        UPDATE booking.bookings
        SET booking_reference = new_ref
        WHERE id = r.id;
    END LOOP;
END $$;

-- 3. Enforce NOT NULL on booking_reference
ALTER TABLE booking.bookings
    ALTER COLUMN booking_reference SET NOT NULL;

-- 4. Enforce format constraint
ALTER TABLE booking.bookings
    DROP CONSTRAINT IF EXISTS chk_bookings_reference_format;

ALTER TABLE booking.bookings
    ADD CONSTRAINT chk_bookings_reference_format
    CHECK (booking_reference ~ '^YUD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$');

-- 5. Enforce unique index for fast lookups and collision prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_booking_reference
    ON booking.bookings (booking_reference);
