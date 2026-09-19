-- ====================================================================
-- Yuding V2 Database Migration V4: Booking Schema Tables
-- ====================================================================

-- 1. Bookings Table
CREATE TABLE IF NOT EXISTS booking.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(12) NOT NULL UNIQUE,
    user_id UUID NOT NULL, -- Logical reference to identity.users(id)
    status VARCHAR(24) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON booking.bookings (user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status_expiry ON booking.bookings (status, expires_at);

-- 2. Booking Items Table
CREATE TABLE IF NOT EXISTS booking.booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES booking.bookings(id) ON DELETE CASCADE,
    item_type VARCHAR(32) NOT NULL CHECK (item_type IN ('ACCOMMODATION', 'FLIGHT', 'ACTIVITY', 'TRANSFER')),
    item_id UUID NOT NULL, -- Logical reference to travel catalog entity
    item_name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal_amount NUMERIC(12, 2) NOT NULL CHECK (subtotal_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking.booking_items (booking_id);

-- 3. Travelers Table
CREATE TABLE IF NOT EXISTS booking.travelers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES booking.bookings(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(32),
    document_type VARCHAR(20) CHECK (document_type IS NULL OR document_type IN ('PASSPORT', 'NATIONAL_ID')),
    document_number VARCHAR(64),
    date_of_birth DATE,
    nationality VARCHAR(3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travelers_booking ON booking.travelers (booking_id);

-- 4. Offer Snapshots Table
CREATE TABLE IF NOT EXISTS booking.offer_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES booking.bookings(id) ON DELETE CASCADE,
    snapshot_hash VARCHAR(64) NOT NULL,
    supplier_quote_json JSONB NOT NULL,
    breakdown_json JSONB NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 5. Booking Status History Table
CREATE TABLE IF NOT EXISTS booking.booking_status_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES booking.bookings(id) ON DELETE CASCADE,
    previous_status VARCHAR(24),
    new_status VARCHAR(24) NOT NULL,
    triggered_by VARCHAR(100) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_history_booking ON booking.booking_status_history (booking_id, created_at);
