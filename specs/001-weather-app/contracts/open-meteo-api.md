# Contract: Open-Meteo and BigDataCloud (consumed)

The default weather provider. Needs no account and no API key. Implemented in
`src/providers/openmeteo`; fixtures in `tests/contract/fixtures/openmeteo-*.json` and
`bigdatacloud-*.json` are **real recordings**. `npm run smoke:live` exercises the live services.

## 1. Forecast: `GET https://api.open-meteo.com/v1/forecast`

Parameters: `latitude`, `longitude` (rounded to 2 decimals), `current`, `hourly`, `daily`,
`timezone=auto`, `wind_speed_unit=ms`, `timeformat=unixtime`, `forecast_days=8`.

| Response path | Maps to |
|---------------|---------|
| `timezone`, `utc_offset_seconds` | `timeZone`, `timeZoneOffset` |
| `current.time` | `observedAt` (also selects the current hour in the hourly series) |
| `current.temperature_2m`, `apparent_temperature` | `temperature`, `feelsLike` |
| `current.relative_humidity_2m`, `pressure_msl` | `humidity`, `pressure` |
| `current.wind_speed_10m`, `wind_direction_10m`, `wind_gusts_10m` | `windSpeed`, `windDirection`, `windGust` |
| `current.is_day`, `current.weather_code` | `isDay`, `condition`/`summary` via the WMO table |
| `hourly.uv_index`, `hourly.visibility` at the current hour | `uvIndex`, `visibility` |
| `hourly.*` from the current hour | 24 hourly entries (`precipitation_probability` missing = 0%) |
| `daily.*` | 7 daily entries, stamped at local noon (`time` is local midnight, plus 12 h) |
| `daily.sunrise[0]`, `daily.sunset[0]` | `sunrise`, `sunset` (null = 0 = unavailable) |

Notes:
- Series may contain `null`; entries missing a temperature or weather code are skipped.
- There are **no weather alerts**: `alerts` is always empty with this provider.
- Errors: HTTP 400 returns `{ "error": true, "reason": ... }` and maps to `server-error`; 429 maps to
  `rate-limited`; other statuses follow the shared mapping in `openweather-api.md`.
- Weather codes: WMO interpretation codes (0 clear, 1 mainly clear, 2 partly cloudy, 3 overcast,
  45/48 fog, 51–57 drizzle, 61–67 rain, 71–77 snow, 80–86 showers, 95–99 thunderstorm); the table
  is in `src/providers/openmeteo/codes.ts`, with each name in English and French. Unknown codes map
  to `unknown`. Open-Meteo has no language option for the forecast, so `summary` is worded from this
  table in the language of the request's `locale`.

## 2. Place search: `GET https://geocoding-api.open-meteo.com/v1/search`

Parameters: `name` (trimmed), `count=5`, `language` (the locale's language, `en` or `fr`; `en` when
there is no locale), `format=json`. Response `results[]` of
`{ name, latitude, longitude, country_code, country, admin1, timezone }`; **no `results` key when
nothing matches** (resolves `[]`). Latitude and longitude are range-checked. `admin1` becomes `region`;
`timezone` fills `Place.timeZone`.

## 3. Naming the device location: `GET https://api-bdc.io/data/reverse-geocode-client`

Open-Meteo has no reverse geocoding, so BigDataCloud's free client-side endpoint names the location.
Parameters: `latitude`, `longitude` (rounded), `localityLanguage` (the locale's language, `en` or `fr`). Name = first non-empty of `city`,
`locality`, `principalSubdivision`, `countryName`; none = `null` (the app shows "Current location").
`principalSubdivision` becomes `region` unless it repeats the name.

## Privacy

Rounded coordinates go to Open-Meteo (weather) and BigDataCloud (naming); search text goes to
Open-Meteo's geocoding. None of it is logged. Open-Meteo's free service is for non-commercial use and
requires attribution (shown in Settings).
