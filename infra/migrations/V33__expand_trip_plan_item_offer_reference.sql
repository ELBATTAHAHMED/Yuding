-- V33: Expand offer_reference column capacity in ai.trip_plan_items for long provider offer IDs
ALTER TABLE ai.trip_plan_items
    ALTER COLUMN offer_reference TYPE VARCHAR(512);
