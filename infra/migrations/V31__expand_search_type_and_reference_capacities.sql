-- V31: Expand search_type check constraint to include singular TRANSFER and TRAIN
-- Also expand resource_reference and thumbnail_url column capacity for robust provider integration

ALTER TABLE identity.user_recent_searches
    DROP CONSTRAINT IF EXISTS user_recent_searches_search_type_check;

ALTER TABLE identity.user_recent_searches
    ADD CONSTRAINT user_recent_searches_search_type_check
    CHECK (search_type IN ('FLIGHTS', 'HOTELS', 'ACTIVITIES', 'TRANSFERS', 'TRAINS', 'TRIP', 'FLIGHT', 'HOTEL', 'ACTIVITY', 'TRANSFER', 'TRAIN'));

ALTER TABLE identity.user_favorites
    ALTER COLUMN resource_reference TYPE VARCHAR(512),
    ALTER COLUMN thumbnail_url TYPE VARCHAR(2048);

ALTER TABLE identity.user_recent_views
    ALTER COLUMN resource_reference TYPE VARCHAR(512),
    ALTER COLUMN thumbnail_url TYPE VARCHAR(2048);
