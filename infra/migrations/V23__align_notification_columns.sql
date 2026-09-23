-- ====================================================================
-- Yuding V2 Database Migration V23: Align Notification Schema Columns
-- Schema: notification
-- ====================================================================

-- Relax legacy V1 NOT NULL constraints on notification_type and template_code
-- since V2 notification service uses event_type and template_name.
ALTER TABLE notification.notifications ALTER COLUMN notification_type DROP NOT NULL;
ALTER TABLE notification.notifications ALTER COLUMN template_code DROP NOT NULL;
