# Homepage review demo data (local Yuding database)

The homepage reads published reviews from `GET /apic/reviews/public/featured` through
Gateway. It contains no review fixtures.

For the October 2026 local QA pass, four fictional users were registered through
`POST /auth/register` via Gateway with unique `example.com` addresses. Their
passwords were generated in memory, not saved. Because normal booking search
cannot create a stay in the past, each account received a local-only, paid mock
booking copied from an existing September 2026 captured hotel offer snapshot.
The local seed wrote booking rows and offer snapshots only to `booking`, and a
successful mock payment row only to `payment`. No review row was inserted
directly. Each user submitted a different review through
`POST /apic/reviews/booking/{reference}` with their own access token. The
review service rechecked booking ownership, captured payment, supplier target,
trip end date, content policy, and duplicate booking before publication.

The seed is development data, not evidence of real customer travel. V36 adds
an optional, reviewer-supplied public display name. The four fictional local
reviews show their fictional account names; all other reviews stay
`Voyageur vérifié` unless the author opts in. The homepage renders initials
avatars locally and never exposes profile photos or private identity records.
Remove these accounts/bookings/reviews before using a production database.
No credentials or tokens belong in this repository.
