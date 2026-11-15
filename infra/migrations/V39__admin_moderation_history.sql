-- Append-only moderation decisions, owned by the engagement domain.
CREATE TABLE engagement.review_moderation_actions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES engagement.reviews(id),
    operator_id UUID NOT NULL,
    decision VARCHAR(24) NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
    rejection_reason VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_moderation_history ON engagement.review_moderation_actions(review_id, created_at);
-- Sandbox refund retries retain the operator and provider outcome in the booking domain.
CREATE TABLE booking.refund_retry_actions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cancellation_id UUID NOT NULL REFERENCES booking.cancellation_requests(id),
    operator_id UUID NOT NULL,
    outcome VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
