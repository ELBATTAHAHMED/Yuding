# Yuding V2 — User Profile & Traveler Management

Phase 49 extends the existing authenticated `/account/profile` page. It does not create a second account system.

## Account data

`identity.users` now stores the existing name/email fields plus `profile_image_key`, `preferred_currency` and `preferred_language`. Currency is limited to `MAD`, `EUR`, `USD` and `GBP`; language is limited to `fr` and `en`. Profile updates use `PATCH /api/account/me` and an explicit DTO, so role, password, verification state and user ownership cannot be mass-assigned.

The profile page exposes the existing email verification state and a protected resend action at `POST /api/account/me/verification/resend`. It reuses Phase 43's hashed, expiring, single-purpose token flow and applies a two-minute resend cooldown. The notification service remains provider-neutral.

## Profile photos

Photos are stored through `ProfileImageStorage` under the ignored runtime directory `.data/profile-images`, never in source or `public`. `POST /api/account/me/photo` accepts JPEG, PNG and WebP signatures up to 5 MB; SVG, HTML, renamed binaries and oversized files are rejected. JPEG/PNG dimensions and extended WebP dimensions are bounded to 5000×5000. The authenticated `GET /api/account/me/photo` endpoint serves the current image, and `DELETE` removes it. The frontend loads it as an authenticated blob, so storage keys are not exposed.

## Saved travelers

`identity.saved_travelers` stores only a user's first name, last name, optional date of birth and `ADULT`/`CHILD`/`INFANT` type. References are public `TRV-*` values. Routes are `GET/POST /api/account/travelers`, `PUT/DELETE /api/account/travelers/{reference}`. Every query scopes by the JWT subject; a reference from another account returns not found. Passport numbers, passport scans, CIN/national IDs, visa data and payment data are deliberately not collected.

## Preferences and integrations

Currency and language are display defaults. Provider-native prices and historical booking snapshots remain unchanged. Smart Trip Planner initializes its budget currency from the saved preference, while the user can select another currency explicitly for that request. Traveler names and profile photos are not sent to Gemini/Groq automatically.

SMTP defaults remain Mailpit (`localhost:1025`). Operators can enable Gmail-compatible SMTP without code or committed secrets using environment variables: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USERNAME`, `SMTP_PASSWORD` (an app password), `SMTP_AUTH=true`, `SMTP_STARTTLS=true`, and `SMTP_FROM_ADDRESS`. Automated tests use mocks/local Mailpit and never send real Gmail email.

## Security and minimization

All profile and traveler routes are authenticated through the Gateway and independently secured by identity-service. The frontend never supplies a user ID. Account role, status, password hash, verification flag and security tokens are not writable from profile updates. Runtime image storage is ignored by Git.
