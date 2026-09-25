ALTER TABLE identity.users
    ADD COLUMN profile_image_key VARCHAR(100),
    ADD COLUMN preferred_currency VARCHAR(3) NOT NULL DEFAULT 'MAD',
    ADD COLUMN preferred_language VARCHAR(2) NOT NULL DEFAULT 'fr';

ALTER TABLE identity.users
    ADD CONSTRAINT ck_users_preferred_currency CHECK (preferred_currency IN ('MAD', 'EUR', 'USD', 'GBP')),
    ADD CONSTRAINT ck_users_preferred_language CHECK (preferred_language IN ('fr', 'en'));

CREATE TABLE identity.saved_travelers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_reference VARCHAR(24) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    traveler_type VARCHAR(12) NOT NULL CHECK (traveler_type IN ('ADULT', 'CHILD', 'INFANT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_travelers_owner ON identity.saved_travelers (user_id, created_at);
