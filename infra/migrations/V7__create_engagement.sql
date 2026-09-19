-- ====================================================================
-- Yuding V2 Database Migration V7: Engagement Schema Tables
-- ====================================================================

-- 1. Reviews Table
CREATE TABLE IF NOT EXISTS engagement.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Logical reference to identity.users(id)
    booking_id UUID, -- Optional logical reference to booking.bookings(id)
    item_type VARCHAR(32) NOT NULL CHECK (item_type IN ('ACCOMMODATION', 'ACTIVITY', 'TRANSFER')),
    item_id UUID NOT NULL, -- Logical reference to travel catalog entity
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(150),
    content TEXT NOT NULL,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(24) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING_MODERATION', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_item ON engagement.reviews (item_type, item_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON engagement.reviews (user_id);

-- 2. Favorites Table
CREATE TABLE IF NOT EXISTS engagement.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Logical reference to identity.users(id)
    item_type VARCHAR(32) NOT NULL CHECK (item_type IN ('DESTINATION', 'ACCOMMODATION', 'ACTIVITY')),
    item_id UUID NOT NULL, -- Logical reference to travel catalog entity
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_favorites_user_item UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON engagement.favorites (user_id);

-- 3. Search History Table
CREATE TABLE IF NOT EXISTS engagement.search_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID, -- Logical reference to identity.users(id)
    session_id VARCHAR(64) NOT NULL,
    search_type VARCHAR(32) NOT NULL CHECK (search_type IN ('ALL', 'HOTEL', 'FLIGHT', 'ACTIVITY', 'TRANSFER')),
    search_params JSONB NOT NULL,
    results_count INT,
    searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_sess ON engagement.search_history (user_id, session_id);

-- 4. Saved Trips Table
CREATE TABLE IF NOT EXISTS engagement.saved_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Logical reference to identity.users(id)
    title VARCHAR(150) NOT NULL,
    description TEXT,
    itinerary_json JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_trips_user ON engagement.saved_trips (user_id);
