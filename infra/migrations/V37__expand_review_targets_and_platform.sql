-- Booking reviews keep their verified booking link. A platform review has no booking.
ALTER TABLE engagement.reviews ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE engagement.reviews ADD COLUMN booking_reference VARCHAR(32);
ALTER TABLE engagement.reviews DROP CONSTRAINT reviews_item_type_check;
ALTER TABLE engagement.reviews ADD CONSTRAINT reviews_item_type_check
    CHECK (item_type IN ('ACCOMMODATION', 'ACTIVITY', 'FLIGHT', 'TRANSFER', 'TRAIN', 'PLATFORM'));
ALTER TABLE engagement.reviews ADD CONSTRAINT reviews_platform_shape_check
    CHECK ((item_type = 'PLATFORM' AND booking_id IS NULL AND is_verified_purchase = false)
        OR (item_type <> 'PLATFORM' AND booking_id IS NOT NULL));
CREATE UNIQUE INDEX uq_reviews_platform_user ON engagement.reviews(user_id)
    WHERE item_type = 'PLATFORM';
CREATE INDEX idx_reviews_user_created ON engagement.reviews(user_id, created_at DESC);
