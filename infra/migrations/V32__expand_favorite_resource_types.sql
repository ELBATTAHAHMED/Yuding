-- V32__expand_favorite_resource_types.sql
-- Expand identity.user_favorites resource_type constraint to allow FLIGHT, TRANSFER, TRAIN

ALTER TABLE identity.user_favorites DROP CONSTRAINT IF EXISTS user_favorites_resource_type_check;
ALTER TABLE identity.user_favorites ADD CONSTRAINT user_favorites_resource_type_check 
    CHECK (resource_type IN ('HOTEL', 'ACTIVITY', 'DESTINATION', 'FLIGHT', 'TRANSFER', 'TRAIN'));
