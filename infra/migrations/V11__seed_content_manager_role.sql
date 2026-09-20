-- ====================================================================
-- Yuding V2 Database Migration V11: Seed Content Manager Role
-- ====================================================================

INSERT INTO identity.roles (name, description)
VALUES ('ROLE_CONTENT_MANAGER', 'Content Manager for travel catalog and destinations')
ON CONFLICT (name) DO NOTHING;
