-- Phase 52: verified reviews remain in the existing engagement schema.
-- Provider catalog identifiers are strings; the original UUID item_id cannot represent them.
ALTER TABLE engagement.reviews ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE engagement.reviews ADD COLUMN provider VARCHAR(64);
ALTER TABLE engagement.reviews ADD COLUMN item_reference VARCHAR(255);
ALTER TABLE engagement.reviews ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE engagement.reviews ALTER COLUMN booking_id SET NOT NULL;
ALTER TABLE engagement.reviews ALTER COLUMN provider SET NOT NULL;
ALTER TABLE engagement.reviews ALTER COLUMN item_reference SET NOT NULL;
ALTER TABLE engagement.reviews ADD CONSTRAINT uq_reviews_booking UNIQUE (booking_id);
ALTER TABLE engagement.reviews ADD CONSTRAINT ck_reviews_content_length CHECK (char_length(content) <= 1200);
ALTER TABLE engagement.reviews DROP CONSTRAINT reviews_status_check;
ALTER TABLE engagement.reviews ADD CONSTRAINT reviews_status_check
    CHECK (status IN ('PENDING_MODERATION', 'APPROVED', 'REJECTED', 'DELETED'));
CREATE INDEX idx_reviews_public_target ON engagement.reviews (item_type, provider, item_reference, created_at DESC)
    WHERE status = 'APPROVED';

CREATE TABLE engagement.review_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_attempts_user_time ON engagement.review_attempts(user_id, attempted_at DESC);
