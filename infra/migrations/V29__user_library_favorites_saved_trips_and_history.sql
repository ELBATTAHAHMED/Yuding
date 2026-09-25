-- ====================================================================
-- Yuding V2 - Migration V29: User Library (Favorites, Saved Trips, Recent Searches & Views)
-- Schema: identity
-- ====================================================================

CREATE TABLE identity.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(24) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL CHECK (resource_type IN ('HOTEL', 'ACTIVITY', 'DESTINATION')),
    resource_reference VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    destination VARCHAR(255),
    thumbnail_url VARCHAR(1024),
    provider_label VARCHAR(64),
    price_snapshot NUMERIC(12, 2),
    currency_snapshot VARCHAR(3),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_favorites_resource UNIQUE (user_id, resource_type, resource_reference)
);

CREATE INDEX idx_user_favorites_user_created ON identity.user_favorites (user_id, created_at DESC);

CREATE TABLE identity.user_saved_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(24) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    trip_plan_reference VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    travelers_count INT NOT NULL DEFAULT 1,
    budget_amount NUMERIC(12, 2),
    budget_currency VARCHAR(3) DEFAULT 'MAD',
    plan_created_at TIMESTAMPTZ,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_saved_trips_plan UNIQUE (user_id, trip_plan_reference)
);

CREATE INDEX idx_user_saved_trips_user_saved ON identity.user_saved_trips (user_id, saved_at DESC);

CREATE TABLE identity.user_recent_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(24) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    search_type VARCHAR(32) NOT NULL CHECK (search_type IN ('FLIGHTS', 'HOTELS', 'ACTIVITIES', 'TRANSFERS', 'TRAINS')),
    criteria_hash VARCHAR(64) NOT NULL,
    origin VARCHAR(100),
    destination VARCHAR(100),
    departure_date DATE,
    return_date DATE,
    travelers_count INT DEFAULT 1,
    criteria_payload JSONB NOT NULL,
    last_searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_recent_searches_hash UNIQUE (user_id, search_type, criteria_hash)
);

CREATE INDEX idx_user_recent_searches_user_searched ON identity.user_recent_searches (user_id, last_searched_at DESC);

CREATE TABLE identity.user_recent_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(24) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL CHECK (resource_type IN ('HOTEL', 'ACTIVITY', 'DESTINATION')),
    resource_reference VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    destination VARCHAR(255),
    thumbnail_url VARCHAR(1024),
    provider_label VARCHAR(64),
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_recent_views_resource UNIQUE (user_id, resource_type, resource_reference)
);

CREATE INDEX idx_user_recent_views_user_viewed ON identity.user_recent_views (user_id, last_viewed_at DESC);
