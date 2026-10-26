# Data Model: W34th3r Weather App

Domain types live in `src/domain/types.ts`. All weather values are stored in **metric** units
(°C, m/s, mm, hPa, metres); conversion to user units happens at presentation time
(see research R-5). All instants are stored as Unix epoch seconds (UTC); display uses the
Place's IANA time zone.

## Place

A location the user can view weather for.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable key: `"current"` for the device location, otherwise `"<lat>,<lon>"` rounded to 2 decimals |
| `name` | string | Display name (city/locality) |
| `region` | string \| null | State/province, for disambiguation |
| `country` | string | ISO 3166 country code |
| `lat` | number | -90..90 |
| `lon` | number | -180..180 |
| `timeZone` | string \| null | IANA zone; filled from the first weather response and cached |
| `kind` | `"current-location"` \| `"saved"` | |
| `sortOrder` | number \| null | Position in the saved list; null for current-location |

**Validation**: lat/lon within range; `name` non-empty; no two saved places share an `id`.
Saving an already-saved place is a no-op.

## WeatherSnapshot

The full result of one successful provider fetch for a Place (the cacheable unit).

| Field | Type | Notes |
|-------|------|-------|
| `placeId` | string | |
| `fetchedAt` | number | Epoch seconds when we received it; drives age/staleness |
| `timeZone` | string | IANA zone from the provider |
| `timeZoneOffset` | number | Provider UTC offset in seconds; used only if the runtime rejects `timeZone` |
| `current` | CurrentConditions | |
| `hourly` | ForecastEntry[] (kind `hour`) | Next 24 entries, ascending by `start` |
| `daily` | ForecastEntry[] (kind `day`) | Next 7 entries, ascending by `start` |
| `alerts` | WeatherAlert[] | Possibly empty |

## CurrentConditions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `observedAt` | number | yes | Epoch seconds |
| `temperature` | number | yes | °C |
| `feelsLike` | number | yes | °C |
| `condition` | ConditionCategory | yes | See below |
| `summary` | string | yes | Provider description in the language of the request, capitalized for display |
| `isDay` | boolean | yes | Derived from `observedAt` vs `sunrise`/`sunset` |
| `high` / `low` | number | yes | Today's values, from `daily[0]` |
| `windSpeed` | number | yes | m/s |
| `windDirection` | number | no | Degrees 0–359 |
| `windGust` | number | no | m/s |
| `humidity` | number | yes | % 0–100 |
| `uvIndex` | number | no | ≥ 0; absent → "unavailable" |
| `visibility` | number | no | metres |
| `pressure` | number | yes | hPa |
| `sunrise` / `sunset` | number | yes | Epoch seconds |

## ForecastEntry

| Field | Type | Notes |
|-------|------|-------|
| `kind` | `"hour"` \| `"day"` | |
| `start` | number | Epoch seconds, period start |
| `temperature` | number | °C; used for `hour` |
| `high` / `low` | number | °C; used for `day` |
| `condition` | ConditionCategory | |
| `summary` | string | |
| `precipChance` | number | 0–100 % (provider `pop` × 100, rounded) |

**Rules**: `hour` entries have `temperature`; `day` entries have `high`/`low` (the unused fields are
absent, modeled as a discriminated union). Entries are strictly ascending by `start`.

## WeatherAlert

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Derived from sender + event + start for stable keys |
| `event` | string | Headline (e.g. "Flood Warning") |
| `sender` | string | Issuing agency |
| `description` | string | Full text, shown on demand |
| `start` / `end` | number | Epoch seconds |
| `severity` | `"minor"` \| `"moderate"` \| `"severe"` \| `"extreme"` \| `"unknown"` | Best-effort mapping from provider tags; `unknown` when unavailable |

## ConditionCategory

Closed set mapped from OpenWeather condition ids (`domain/conditions.ts`):

`clear`, `partly-cloudy`, `cloudy`, `drizzle`, `rain`, `thunderstorm`, `snow`, `sleet`, `mist-fog`,
`dust-smoke`, `squall-tornado`, `unknown`.

Combined with `isDay` this is the key into the theme engine (see research R-7). `unknown` has a
neutral fallback theme so unmapped provider ids never break the UI.

## UserPreferences

| Field | Type | Default |
|-------|------|---------|
| `temperatureUnit` | `"c"` \| `"f"` | From device region (US → `f`, otherwise `c`) |
| `windSpeedUnit` | `"ms"` \| `"kmh"` \| `"mph"` \| `"kn"` | From device region |
| `precipitationUnit` | `"mm"` \| `"in"` | From device region |
| `appearance` | `"system"` \| `"light"` \| `"dark"` | `system` |
| `lastViewedPlaceId` | string | `"current"` |
| `hasSeenLocationPrompt` | boolean | `false` |

## Freshness (derived, not stored)

Computed by `domain/freshness.ts` from `WeatherSnapshot.fetchedAt` and the current time:

| State | Rule | UI behavior |
|-------|------|-------------|
| `fresh` | age ≤ 15 min | No indicator |
| `stale` | age > 15 min | Triggers refetch; shows "Updated N min ago" if the refetch fails or while offline |

## Relationships

- `Place` 1 — 0..1 `WeatherSnapshot` (latest cached per place); snapshots are replaced on each
  successful fetch.
- `WeatherSnapshot` 1 — 1 `CurrentConditions`, 1 — 24 hourly, 1 — 7 daily, 1 — 0..n `WeatherAlert`.
- `UserPreferences` is a singleton.

## State transitions

**Weather load per Place** (query state surfaced to UI):

```text
idle → loading → success(fresh)
                      │ age > 15 min or app foregrounded
                      ▼
                 success(stale) → refetching → success(fresh)
                      │                     └→ error(kind) → success(stale, shown with age)
loading → error(kind) [no cached data] → retry → loading
```

`error(kind)` ∈ `offline | timeout | rate-limited | unauthorized | not-found |
malformed-response | server-error` (research R-11).

**Location permission**: `undetermined → granted | denied`. `denied` routes to search-first
state; user may later enable it in OS settings, detected on app foreground.
