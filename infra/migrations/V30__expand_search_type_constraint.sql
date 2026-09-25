-- V30: Expand user_recent_searches search_type check constraint to support TRIP and singular verticals

ALTER TABLE identity.user_recent_searches
    DROP CONSTRAINT IF EXISTS user_recent_searches_search_type_check;

ALTER TABLE identity.user_recent_searches
    ADD CONSTRAINT user_recent_searches_search_type_check
    CHECK (search_type IN ('FLIGHTS', 'HOTELS', 'ACTIVITIES', 'TRANSFERS', 'TRAINS', 'TRIP', 'FLIGHT', 'HOTEL', 'ACTIVITY'));
