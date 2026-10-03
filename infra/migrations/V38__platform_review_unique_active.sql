-- A deleted platform review remains in the audit trail but must not block a new active one.
DROP INDEX IF EXISTS engagement.uq_reviews_platform_user;
CREATE UNIQUE INDEX uq_reviews_platform_user_active ON engagement.reviews(user_id)
    WHERE item_type = 'PLATFORM' AND status <> 'DELETED';
