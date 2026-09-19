-- ====================================================================
-- Yuding V2 Database Migration V3: Travel Schema Tables
-- ====================================================================

-- 1. Destinations Table
CREATE TABLE IF NOT EXISTS travel.destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    description TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    hero_image_url VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destinations_city_country ON travel.destinations (city, country_code);

-- 2. Providers Table
CREATE TABLE IF NOT EXISTS travel.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(32) NOT NULL,
    api_endpoint VARCHAR(255),
    rate_limit_per_minute INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    config_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Accommodations Table
CREATE TABLE IF NOT EXISTS travel.accommodations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID NOT NULL REFERENCES travel.destinations(id) ON DELETE RESTRICT,
    provider_id UUID REFERENCES travel.providers(id) ON DELETE SET NULL,
    external_id VARCHAR(128),
    name VARCHAR(200) NOT NULL,
    property_type VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    star_rating NUMERIC(2, 1) CHECK (star_rating BETWEEN 1 AND 5),
    description TEXT,
    amenities_json JSONB,
    images_json JSONB,
    contact_phone VARCHAR(32),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodations_dest ON travel.accommodations (destination_id, is_active);
CREATE INDEX IF NOT EXISTS idx_accommodations_external ON travel.accommodations (provider_id, external_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_amenities ON travel.accommodations USING GIN (amenities_json);

-- 4. Room Types Table
CREATE TABLE IF NOT EXISTS travel.room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES travel.accommodations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_occupancy INT NOT NULL CHECK (max_occupancy > 0),
    base_price_per_night NUMERIC(12, 2) NOT NULL CHECK (base_price_per_night >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    total_rooms INT NOT NULL CHECK (total_rooms >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_types_property ON travel.room_types (accommodation_id);

-- 5. Flights Table
CREATE TABLE IF NOT EXISTS travel.flights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES travel.providers(id) ON DELETE RESTRICT,
    external_offer_id VARCHAR(255) NOT NULL,
    origin_iata VARCHAR(3) NOT NULL,
    destination_iata VARCHAR(3) NOT NULL,
    departure_time TIMESTAMPTZ NOT NULL,
    arrival_time TIMESTAMPTZ NOT NULL,
    airline_code VARCHAR(3) NOT NULL,
    flight_number VARCHAR(16) NOT NULL,
    aircraft_type VARCHAR(50),
    cabin_class VARCHAR(20) NOT NULL DEFAULT 'ECONOMY',
    price_amount NUMERIC(12, 2) NOT NULL CHECK (price_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    seats_available INT NOT NULL CHECK (seats_available >= 0),
    valid_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flights_route_dates ON travel.flights (origin_iata, destination_iata, departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_validity ON travel.flights (valid_until);

-- 6. Activities Table
CREATE TABLE IF NOT EXISTS travel.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID NOT NULL REFERENCES travel.destinations(id) ON DELETE RESTRICT,
    provider_id UUID REFERENCES travel.providers(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    duration_hours NUMERIC(4, 1) NOT NULL,
    base_price NUMERIC(12, 2) NOT NULL CHECK (base_price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    max_participants INT,
    meeting_point TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_dest_cat ON travel.activities (destination_id, category, is_active);

-- 7. Transfers Table
CREATE TABLE IF NOT EXISTS travel.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID NOT NULL REFERENCES travel.destinations(id) ON DELETE RESTRICT,
    provider_id UUID REFERENCES travel.providers(id) ON DELETE SET NULL,
    transfer_type VARCHAR(32) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    origin_location TEXT NOT NULL,
    destination_location TEXT NOT NULL,
    base_price NUMERIC(12, 2) NOT NULL CHECK (base_price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    max_passengers INT NOT NULL CHECK (max_passengers > 0),
    max_luggage INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfers_route ON travel.transfers (origin_location, destination_location);

-- 8. Provider Offers (Offer Cache) Table
CREATE TABLE IF NOT EXISTS travel.provider_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES travel.providers(id) ON DELETE CASCADE,
    item_type VARCHAR(32) NOT NULL,
    item_id UUID,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    payload_json JSONB NOT NULL,
    cached_price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_offers_expiry ON travel.provider_offers (expires_at);
