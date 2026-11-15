-- ==============================================================================
-- V40: Content Management (Featured Destinations, Custom Offers) & Platform Settings
-- ==============================================================================

-- 1. Featured Destinations (schema travel)
CREATE TABLE IF NOT EXISTS travel.featured_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    country_label VARCHAR(100) NOT NULL,
    editorial_title VARCHAR(150) NOT NULL,
    editorial_line TEXT NOT NULL,
    editorial_detail TEXT NOT NULL,
    image_id VARCHAR(64),
    image_url VARCHAR(512),
    target_url VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    status VARCHAR(24) NOT NULL DEFAULT 'PUBLISHED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_featured_destinations_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_featured_destinations_status_order
    ON travel.featured_destinations (status, display_order ASC);

-- Seed canonical featured destinations
INSERT INTO travel.featured_destinations (city, country, country_label, editorial_title, editorial_line, editorial_detail, image_id, target_url, display_order, status)
VALUES
    ('Dakhla', 'Morocco', 'Maroc', 'Dakhla Oasis & Lagune', 'Là où la terre laisse passer l’océan.', 'Le vent, la lagune et des journées qui s’étirent sans programme.', '30560213', '/hotels?destination=Dakhla&countryCode=MA', 1, 'PUBLISHED'),
    ('Lisbon', 'Portugal', 'Portugal', 'Lisbonne Authentique', 'Perdez une rue. Trouvez une autre lumière.', 'Lisbonne se découvre à pied, colline après colline.', '26824153', '/hotels?destination=Lisbon&countryCode=PT', 2, 'PUBLISHED'),
    ('Kyoto', 'Japan', 'Japon', 'Kyoto Tradition & Détours', 'Le détour devient le voyage.', 'À Kyoto, ralentir est souvent la plus belle façon d’avancer.', '37943558', '/hotels?destination=Kyoto&countryCode=JP', 3, 'PUBLISHED')
ON CONFLICT DO NOTHING;

-- 2. Yuding Custom Curated Offers (schema travel)
CREATE TABLE IF NOT EXISTS travel.custom_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id VARCHAR(64) NOT NULL UNIQUE,
    provider VARCHAR(64) NOT NULL DEFAULT 'HBX',
    source VARCHAR(64) NOT NULL DEFAULT 'YUDING_CUSTOM',
    title VARCHAR(200) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    duration_hours NUMERIC(4, 1) NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PUBLISHED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_custom_offers_price CHECK (price >= 0),
    CONSTRAINT ck_custom_offers_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_custom_offers_dest_status
    ON travel.custom_offers (destination, status, created_at DESC);

-- Seed existing code-defined YUDING_CUSTOM curated offers
INSERT INTO travel.custom_offers (offer_id, provider, source, title, destination, country, category, price, currency, duration_hours, image_url, description, status)
VALUES
    ('YUDING-CUSTOM-001', 'HBX', 'YUDING_CUSTOM', 'Excursion Désert d''Agafay & Coucher de Soleil', 'Marrakech', 'Morocco', 'Aventure', 45.00, 'EUR', 5.0, '/image/a1.jpg', 'Expérience exclusive Yuding: Balade à dos de chameau dans le désert d''Agafay suivie d''un dîner sous tente berbère traditionnelle.', 'PUBLISHED'),
    ('YUDING-CUSTOM-002', 'HBX', 'YUDING_CUSTOM', 'Visite Guidée des Palais et Médina Historique', 'Marrakech', 'Morocco', 'Culture', 30.00, 'EUR', 4.0, '/image/a2.jpg', 'Visite patrimoniale exclusive Yuding: Exploration des palais Bahia et El Badi avec guide conférencier officiel.', 'PUBLISHED')
ON CONFLICT (offer_id) DO UPDATE SET
    title = EXCLUDED.title,
    price = EXCLUDED.price,
    duration_hours = EXCLUDED.duration_hours,
    description = EXCLUDED.description,
    updated_at = now();

-- 3. Operational Platform Settings (schema identity)
CREATE TABLE IF NOT EXISTS identity.platform_settings (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(32) NOT NULL DEFAULT 'OPERATIONAL',
    is_public BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO identity.platform_settings (key, value, description, category, is_public)
VALUES
    ('maintenance_mode', 'false', 'Mode maintenance global de la plateforme', 'SYSTEM', false),
    ('booking_auto_expiry_minutes', '30', 'Délai d''expiration automatique des dossiers non réglés (minutes)', 'BOOKING', false),
    ('refund_grace_hours', '24', 'Fenêtre d''annulation sans frais standard (heures)', 'FINANCE', false),
    ('support_email', 'contact@yuding.travel', 'Adresse e-mail de contact du support client', 'COMMUNICATION', true),
    ('ai_assistant_enabled', 'true', 'Activation du widget Smart Trip Planner et Chat IA', 'AI', true),
    ('max_travelers_per_booking', '6', 'Nombre maximum de voyageurs par dossier', 'BOOKING', false)
ON CONFLICT (key) DO NOTHING;
