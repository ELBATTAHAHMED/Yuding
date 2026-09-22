# Yuding V2 — External API Cache & Provider Quota Protection

## 1. Overview & Architectural Goals
The External API Cache provides centralized, provider-aware caching for all external upstream calls across Yuding V2. It is engineered to:
1. **Protect Upstream Quotas & Rate Limits**: Shield third-party providers (Geoapify, Open-Meteo, Frankfurter, Pexels, Scrappa, Nuitee, HBX) from repetitive queries.
2. **Accelerate Response Times**: Deliver low-latency cached results (under 60ms) for high-frequency travel queries.
3. **Prevent Stampedes**: Utilize an in-flight request coalescing mechanism so concurrent identical requests trigger exactly one upstream API call.
4. **Preserve Booking Invariants**: Maintain strict separation between cached discovery data and authoritative booking truth. Offer revalidations (`revalidateOffer`) **always** query providers live and bypass the cache completely.
5. **Graceful Degradation**: Ensure that Redis connection failure or timeouts never break travel searches; failures gracefully degrade to direct upstream calls.

---

## 2. Infrastructure & Storage
- **Platform**: Redis 7 on `localhost:6379` (Docker container `yuding-redis`).
- **No Added Infrastructure**: Reuses existing Redis infrastructure without adding Memcached, Hazelcast, or Caffeine.
- **Fail-Safe Client**: Spring Boot `RedisTemplate<String, String>` configured with 2-second network timeout.
- **Serialization**: Safe Jackson JSON serialization with `JavaTimeModule` support for `LocalDate`, `Instant`, `LocalTime`, and explicit `BigDecimal` string preservation.

---

## 3. Key Namespace Design
All keys follow deterministic, structured namespacing to eliminate collision and ensure auditability:
```
yuding:v2:{domain}:{provider}:{version}:{descriptorOrHash}
```

### Namespace Schemes:
| Domain | Provider | Key Format / Descriptor | Example Key |
| :--- | :--- | :--- | :--- |
| **Geo Autocomplete** | `geoapify` | `auto:{SHA256(text:type:country:lang:limit)}` | `yuding:v2:geo:geoapify:v1:auto:12279682790e...` |
| **Geo Geocoding** | `geoapify` | `geocode:{SHA256(text:country:lang:limit)}` | `yuding:v2:geo:geoapify:v1:geocode:ab12ef...` |
| **Geo Reverse** | `geoapify` | `reverse:{lat4dec}:{lon4dec}:{lang}` | `yuding:v2:geo:geoapify:v1:reverse:31.6258:-7.9892:fr` |
| **Geo POIs** | `geoapify` | `poi:{lat4dec}:{lon4dec}:{radius}:{sortedCats}:{limit}` | `yuding:v2:geo:geoapify:v1:poi:31.6295:-7.9811:5000:catering,tourism:10` |
| **Weather** | `open_meteo` | `{lat4dec}:{lon4dec}:d{forecastDays}` | `yuding:v2:weather:open_meteo:v1:31.6295:-7.9811:d7` |
| **Currency** | `frankfurter` | `{BASE}:{QUOTE}` | `yuding:v2:currency:frankfurter:v1:EUR:MAD` |
| **Images** | `pexels` | `dest:{SHA256(city:country:countryCode:limit)}` | `yuding:v2:images:pexels:v1:dest:8af02d336dfd...` |
| **Flight Search** | `scrappa` | `search:{origin}:{destination}:{depDate}:{travelClass}:{adults}:{currency}` | `yuding:v2:search:flights:scrappa:v1:search:CMN:RAK:2026-10-01:ECONOMY:1:MAD` |
| **Hotel Search** | `nuitee` | `search:{destination}:{checkIn}:{checkOut}:{adults}:{rooms}:{currency}` | `yuding:v2:search:hotels:nuitee:v1:search:Marrakech:2026-10-01:2026-10-05:2:1:MAD` |
| **Activity Search** | `hbx` | `search:{destination}:{date}:{activityType}:{currency}` | `yuding:v2:search:activities:hbx:v1:search:Agadir:2026-10-01:CULTURE:MAD` |
| **Transfer Search** | `hbx` | `search:{pickup}->{dropoff}:{date}:{time}:{type}:{pax}:{currency}` | `yuding:v2:search:transfers:hbx:v1:search:RAK->Hotel Atlas:2026-10-01:14:00:PRIVATE:2:MAD` |
| **Train Search** | `oncf_gtfs` / `transitous` | `search:{origin}->{dest}:{date}:{time}:{class}:{currency}` | `yuding:v2:search:trains:oncf_gtfs:v1:search:Casa-Voyageurs->Rabat-Agdal:...` |

---

## 4. Centralized TTL Policy
TTLs are calibrated to the underlying data volatility:
- **Geo Reference Data (Autocomplete / Forward & Reverse Geocoding)**: `7 days` (`604800s`).
- **Geo Nearby POIs**: `24 hours` (`86400s`).
- **Weather Forecast**: `15 minutes` (`900s`).
- **Currency Exchange Rates**: `24 hours` (`86400s`) (daily reference rate updates).
- **Pexels Destination Context Photography**: `24 hours` (`86400s`).
- **Flight Searches**: `60 seconds` (`60s`) (rapidly changing airfares and seat blocks).
- **Hotel / Activity / Transfer / Train Searches**: `120 seconds` (`120s`).
- **Empty Result Negative Caching**: `30 seconds` (`30s`) for valid successful 200 responses with zero items.

---

## 5. Security, Invariants & Fail-Safe Protection
1. **Zero Secret Leakage**:
   - Cache keys and values never contain API keys, passwords, bearer tokens, or client PII.
2. **Provider Errors Never Cached**:
   - HTTP 401, 429, 5xx, upstream timeouts, and connection errors are immediately re-thrown and **never** stored in Redis.
3. **Revalidation Invariant**:
   - Search results in cache are discovery-only. All offer revalidations (`revalidateOffer`) bypass cache and query external providers live to ensure real availability and pricing prior to checkout.
4. **Anti-Stampede Coalescing**:
   - Concurrently incoming identical requests register in an atomic `inFlight` map, ensuring that only the leader thread invokes the upstream provider while concurrent callers await the single resulting future.
5. **Fail-Safe Graceful Fallback**:
   - If Redis is down, unreachable, or timing out, the cache logs a structured warning and delegates directly to the upstream loader. Search workflows never fail due to Redis unavailability.
