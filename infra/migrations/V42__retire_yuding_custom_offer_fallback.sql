-- Retire the internal YUDING_CUSTOM activity fallback.
-- Keep historical rows for auditability, but ensure they cannot be served or managed.
UPDATE travel.custom_offers
SET status = 'ARCHIVED',
    updated_at = now()
WHERE status <> 'ARCHIVED';

COMMENT ON TABLE travel.custom_offers IS
  'Retired legacy catalogue. Preserved only for historical audit; not exposed by the application.';
