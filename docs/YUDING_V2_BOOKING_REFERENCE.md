# Yuding V2 — Public Booking Reference Architecture (Phase 34)

## Overview
Phase 34 introduces human-readable, cryptographically random, collision-resistant public booking references (`booking_reference`) to decouple public-facing identifiers from internal database primary keys (`id: UUID`).

---

## 1. Dual Identifier Architecture

| Identifier | Type | Scope | Exposure | Mutability |
| :--- | :--- | :--- | :--- | :--- |
| **Internal ID** (`id`) | `UUID` | Database Primary Key, Foreign Keys, Audit logs | Strictly Internal (Omitted from public DTOs) | Immutable |
| **Public Reference** (`booking_reference`) | `VARCHAR(16)` | Public APIs, URLs, Customer Support, UI Displays | Publicly exposed (`YUD-XXXXXXXX`) | Immutable across all lifecycle states |

---

## 2. Reference Specification & Alphabet

- **Format**: `YUD-XXXXXXXX` (Length: exactly 12 characters: 4-character prefix `YUD-` + 8-character uppercase Base32 suffix).
- **Alphabet**: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (32 characters).
- **Excluded Characters**:
  - `0` (Zero) and `O` (Uppercase O) — prevents visual confusion.
  - `1` (One) and `I` (Uppercase I) — prevents visual confusion.
- **Entropy**: \( 32^8 = 1,099,511,627,776 \) possible combinations (\(\approx 35\) bits of cryptographic randomness via `java.security.SecureRandom`).
- **Collision Handling**: Bounded retry loop (maximum 5 attempts). If uniqueness is not secured within 5 attempts, a `BookingConflictException` (HTTP 409) is thrown.

---

## 3. Database Schema (Flyway V14)

```sql
-- Flyway migration V14: Add public booking reference
ALTER TABLE booking.bookings
    ADD COLUMN booking_reference VARCHAR(16);

-- Backfill existing rows with random references
UPDATE booking.bookings
SET booking_reference = 'YUD-' || upper(substr(md5(random()::text || id::text), 1, 8))
WHERE booking_reference IS NULL;

-- Enforce constraints
ALTER TABLE booking.bookings
    ALTER COLUMN booking_reference SET NOT NULL,
    ADD CONSTRAINT chk_bookings_reference_format CHECK (booking_reference ~ '^YUD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$'),
    ADD CONSTRAINT uk_bookings_booking_reference UNIQUE (booking_reference);

CREATE UNIQUE INDEX idx_bookings_booking_reference ON booking.bookings(booking_reference);
```

---

## 4. API & Endpoint Migration

All public endpoints now operate with the public `bookingReference`:

| Endpoint | Method | Path Variable / Header | Response DTO Field |
| :--- | :--- | :--- | :--- |
| `POST /bookings` | `POST` | Header: `Location: /bookings/YUD-XXXXXXXX` | `bookingReference: "YUD-XXXXXXXX"` |
| `GET /bookings/{reference}` | `GET` | `reference`: `YUD-XXXXXXXX` | `bookingReference: "YUD-XXXXXXXX"` |
| `POST /bookings/{reference}/cancel` | `POST` | `reference`: `YUD-XXXXXXXX` | `bookingReference: "YUD-XXXXXXXX"` |
| `GET /bookings/me` | `GET` | JWT Principal | List of items with `bookingReference` |

- Invalid or malformed references return `400 Bad Request`.
- Non-existent references return `404 Not Found`.
- Unauthorized requests return `403 Forbidden` or `401 Unauthorized`.
- UUID primary keys are NEVER returned in `BookingResponseDto`.
