# Contract: OpenWeather API (consumed)

The app consumes, and does not expose, this API. This document records only the surface W34th3r
relies on. Only `src/providers/openweather` may know about it. Verify field names against the
current OpenWeather documentation and recorded fixtures (`tests/contract/fixtures`) before
implementing the schemas.

Base URL: `https://api.openweathermap.org` (configurable via `src/config`).
Auth: `appid=<API key>` query parameter on every request.

## 1. One Call 3.0: weather for a coordinate

`GET /data/3.0/onecall?lat={lat}&lon={lon}&units=metric&exclude=minutely&appid={key}`

Coordinates are rounded to 2 decimals before sending. Always `units=metric` (see research R-5). `lang` is left at the default (English) for v1.

Fields used from the response:

| Path | Maps to | Required |
|------|---------|----------|
| `timezone` (IANA string) | `WeatherSnapshot.timeZone` | yes |
| `current.dt` | `CurrentConditions.observedAt` | yes |
| `current.temp`, `current.feels_like` | `temperature`, `feelsLike` | yes |
| `current.sunrise`, `current.sunset` | `sunrise`, `sunset` | no (falls back to `daily[0]`, then `0` = "unavailable" in polar regions) |
| `current.pressure`, `current.humidity` | `pressure`, `humidity` | yes |
| `current.wind_speed` | `windSpeed` | yes |
| `current.wind_deg`, `current.wind_gust` | `windDirection`, `windGust` | no |
| `current.uvi` | `uvIndex` | no |
| `current.visibility` | `visibility` | no |
| `current.weather[0].id` / `.description` | `condition` (via mapping) / `summary` | yes |
| `hourly[0..23].dt, temp, pop, weather[0]` | hourly entry | `dt`, `temp`, `weather` yes; `pop` no (missing = 0%) |
| `daily[0..6].dt, temp.min, temp.max, pop, weather[0]` | daily entry | `dt`, `temp`, `weather` yes; `pop` no (missing = 0%) |
| `alerts[].sender_name, event, start, end, description, tags` | `WeatherAlert` | no (absent when none). OpenWeather sends no severity, so it is inferred from the event name: "Emergency"/"Extreme" → extreme, "Warning" → severe, "Watch" → moderate, "Advisory" → minor, otherwise unknown |

Rules:
- The `alerts` key is absent when there are no alerts. This is not an error.
- `hourly` has up to 48 entries and `daily` up to 8; the app uses the first 24 and 7. Fewer than
  that is accepted (the UI shows what exists); empty arrays are a `malformed-response`.
- `pop` is 0–1; the app converts to a rounded 0–100 percentage.
- Unknown extra fields are ignored (schemas are non-strict).

## 2. Geocoding: search by name

`GET /geo/1.0/direct?q={query}&limit=5&appid={key}`

Response: array of `{ name, local_names?, lat, lon, country, state? }`. Maps to `Place`
(`state` → `region`). An empty array is a valid "no places found" result, not an error.

## 3. Geocoding: reverse (name the device location)

`GET /geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={key}`

Same item shape as above. If the result is empty or the call fails, the current-location place is
shown with a generic label ("Current location"); weather still loads.

## Error behavior

| Condition | Classified as |
|-----------|---------------|
| No connectivity / request cannot be sent | `offline` |
| No response within the client timeout (10 s) | `timeout` |
| HTTP 401 or 403 | `unauthorized` (configuration problem; logged, generic message to user) |
| HTTP 404 | `not-found` |
| HTTP 429 | `rate-limited` (no automatic hot-loop retry; back off, keep showing cached data) |
| HTTP 5xx, or any other unexpected 4xx | `server-error` |
| 2xx but fails required-field schema | `malformed-response` |

Retries: at most one automatic retry with short backoff for `timeout` and `server-error`;
user-initiated retry otherwise.

## Request budget

One Call 3.0 is called at most once per place per 15 minutes (cache `staleTime`), plus manual
refresh. Geocoding search is debounced (~300 ms) and cached for the session. Search queries
are never logged.

## Privacy

Coordinates sent are rounded to 2 decimals. The `appid` and coordinates MUST NOT appear in logs.
