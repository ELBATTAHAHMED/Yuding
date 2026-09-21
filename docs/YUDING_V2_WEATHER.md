# Yuding V2 — Live Weather (Phase 27)

## Boundary and endpoint

The browser calls only the API Gateway endpoint:

```text
GET /travel/weather?lat={latitude}&lon={longitude}&forecastDays={1..16}
```

The Gateway's existing `/travel/**` route forwards this to `travel-service`. The frontend never calls Open-Meteo directly and does not receive provider configuration or secrets. `lat` must be in `[-90, 90]`, `lon` in `[-180, 180]`, and `forecastDays` is optional (the configured default is 7) but capped to Open-Meteo's documented maximum of 16.

## Provider model

`WeatherService` depends on the provider-neutral `WeatherProvider` interface. `OpenMeteoWeatherProvider` is the current implementation, using one Open-Meteo `/v1/forecast` request containing `current`, `hourly`, and `daily` variable lists, `timezone=auto`, and metric defaults. Raw Open-Meteo response classes are confined to the provider package; the public response is a normalized `WeatherResponseDto` with current, hourly, and daily forecasts.

The implementation follows the current [Open-Meteo Forecast API documentation](https://open-meteo.com/en/docs): daily fields require a timezone, forecasts default to seven days, and the endpoint supports up to 16 days. Open-Meteo is a public no-key integration for this endpoint; no weather key is configured or stored.

## Configuration

Set these non-secret values in `backend/travel-service/.env.local` (the service startup loader already reads this file):

```dotenv
OPEN_METEO_BASE_URL=https://api.open-meteo.com
TRAVEL_WEATHER_PROVIDER=open-meteo
OPEN_METEO_FORECAST_DAYS=7
OPEN_METEO_TIMEZONE=auto
```

The tracked `backend/travel-service/.env.example` contains the same safe defaults. No API key variable is needed.

## WMO normalization

Open-Meteo `weather_code` values are converted server-side to stable conditions: `CLEAR`, `PARTLY_CLOUDY`, `CLOUDY`, `FOG`, `DRIZZLE`, `RAIN`, `SNOW`, `SHOWERS`, `THUNDERSTORM`, or `UNKNOWN`. The service also supplies a friendly label and a compass label for current wind direction. Provider errors are mapped to the existing `TravelProviderException` model, so invalid requests, rate limits, timeouts, invalid payloads, and provider outages do not leak implementation details.

## Frontend behavior and attribution

`useWeather` uses TanStack Query with a ten-minute stale period and runs only after a `GeoPlace` supplies coordinates. `DestinationWeather` is embedded in the existing destination guide on `/hotels` and `/activities`; it includes loading, retryable unavailable, current-condition, and horizontally scrollable daily-forecast states. It displays the required source credit: [Weather data by Open-Meteo.com](https://open-meteo.com/).

## Verification

Backend tests use `MockRestServiceServer` or mocks and make no live Open-Meteo requests. Frontend tests mock `fetch` and assert that the request targets the Gateway `/travel/weather` path rather than an Open-Meteo URL. A separate manual smoke check should select a GeoPlace in the running browser and confirm the weather card renders through `http://localhost:8888`.
