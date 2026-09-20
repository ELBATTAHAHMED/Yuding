-- ====================================================================
-- Yuding V2 Database Migration V10: Seed Identity Roles
-- ====================================================================

INSERT INTO identity.roles (name, description) VALUES
    ('ROLE_USER', 'Standard authenticated customer / user with travel booking access'),
    ('ROLE_ADMIN', 'Platform administrator with full management access'),
    ('ROLE_SUPPORT', 'Customer support agent with assistance capabilities')
ON CONFLICT (name) DO NOTHING;
