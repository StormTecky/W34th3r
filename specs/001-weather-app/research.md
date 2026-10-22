# Research: W34th3r Weather App

All Technical Context unknowns are resolved below. No `NEEDS CLARIFICATION` items remain.

> Provider facts (endpoints, response fields, quotas) reflect OpenWeather's documentation as known
> when this plan was written. Verify against the current docs and with real fixture recordings
> before relying on exact field names or quota numbers (see quickstart step 3).

## R-1: Which OpenWeather API to use

- **Decision**: One Call API 3.0 (`/data/3.0/onecall`) for weather, plus the Geocoding API
  (`/geo/1.0/direct` for search, `/geo/1.0/reverse` for naming the device location).
- **Rationale**: The spec requires current conditions, 24 h hourly, 7-day daily, UV index,
  visibility, sunrise/sunset and alerts. One Call 3.0 returns all of these in a single request
  per place (current, 48 h hourly, 8-day daily, alerts, IANA `timezone`), which minimizes calls
  against the quota and keeps the cache model simple.
- **Alternatives considered**:
  - *Free 2.5 `/weather` + `/forecast`*: no daily summaries, no alerts, no UV index in the same
    call, 3-hourly forecast steps; would require several calls per place and client-side
    aggregation. Rejected.
  - *Another provider (Open-Meteo, WeatherAPI)*: the user chose OpenWeather; the adapter keeps
    this swap possible later.
- **Note**: One Call 3.0 requires subscribing to the "One Call by Call" plan (a payment method is
  needed, with a free daily allowance and an account-level call cap that can be set). This is a
  setup prerequisite for the maintainer, documented in quickstart.

## R-2: API key handling in a client-only app

- **Decision**: Read the key from environment config at build time (`EXPO_PUBLIC_*` variable in an
  untracked `.env.local`, with `.env.example` committed). Set a daily call cap on the OpenWeather
  account. Access the key only through `src/config`.
- **Rationale**: A backend/proxy is the only way to truly hide the key but adds a second deployable
  project, hosting, and operations for v1. The constitution requires keys not be committed and
  supplied via environment config, which this satisfies. A call cap bounds the cost of extraction.
- **Alternatives considered**:
  - *Thin proxy (serverless function)*: best security, more scope. Deferred; the adapter makes this
    a drop-in change (`client.ts` base URL and auth change only).
  - *Secure-store at runtime*: does not help; the key must still ship with or be fetched by the app.

## R-3: App framework, navigation and language

- **Decision**: Expo (managed workflow) with TypeScript strict, Hermes, New Architecture;
  expo-router for navigation.
- **Rationale**: Fastest path to a polished iOS/Android app, first-class support for location,
  fonts, and animation libraries, simple CI and OTA/EAS builds later. File-based routes keep
  `app/` thin. Strict TypeScript satisfies Principle I.
- **Language**: English and French, following the device (`expo-localization`). Words live in typed
  catalogs under `src/domain/messages/`; formats come from `Intl` with the device locale, so the
  region still matters (`fr-CA` vs `fr-FR`). No i18n library: the app has two languages and a few
  dozen strings, and plain typed objects give compile-time completeness (Principle IV).
- **Alternatives considered**: Bare React Native CLI (more native setup, no benefit here);
  React Navigation without expo-router (equivalent, but more manual route wiring).

## R-4: Data fetching, caching, and offline behavior

- **Decision**: TanStack Query with persisted cache (AsyncStorage persister). Query key per
  place and language (condition names are translated by the provider); `staleTime` of 15 minutes; refetch on app foreground and manual pull-to-refresh;
  `gcTime` long enough to survive restarts (e.g. 7 days). Weather data older than the last
  successful fetch is shown with an "updated N min ago" label when a refetch fails.
- **Rationale**: Directly implements FR-013 (refresh if >15 min), FR-014 (last known data on
  failure) and SC-005 (cached data <1 s) with well-tested library behavior instead of custom
  cache code (Principle IV).
- **Alternatives considered**: Custom fetch + AsyncStorage cache (more code to test and maintain);
  Redux Toolkit Query (heavier, no advantage here); SWR (weaker persistence story on RN).

## R-5: Units strategy

- **Decision**: Always request `units=metric` from OpenWeather, store and cache domain values in
  metric, and convert to the user's chosen units in the presentation layer (`domain/units.ts`).
  Default units derive from the device region at first launch (Expo Localization).
- **Rationale**: Changing units is instant and never refetches or invalidates the cache (saves
  quota); one canonical unit set simplifies tests (FR-010, SC-007).
- **Alternatives considered**: Request the API in user units (cache fragmentation, refetch on
  every unit change).

## R-6: Time zones and place-local time

- **Decision**: Use the IANA `timezone` string from One Call with `Intl.DateTimeFormat`
  (`timeZone` option) via helpers in `domain/time.ts`. Fall back to `timezone_offset` only if the
  IANA zone is rejected by the runtime.
- **Rationale**: A fixed offset is wrong for forecast entries that fall after a daylight-saving
  change within the 7-day window. Hermes on current React Native supports `Intl` time zones; unit
  tests cover DST boundaries, date-line zones and half-hour offsets (SC-007).
- **Alternatives considered**: date-fns-tz / Luxon (extra dependency, only needed if Hermes `Intl`
  proves inadequate during implementation; revisit then).

## R-7: Visual design system and motion

- **Decision**: Central design tokens in `src/theme` (color ramps per condition × day/night,
  type scale, spacing, radii, elevation, motion durations). A theme engine maps
  `(ConditionCategory, isDay)` → gradient, accent, imagery and ambient animation preset.
  Ambient effects (rain, snow, drifting clouds) use react-native-reanimated worklets and
  expo-linear-gradient; effects are disabled or replaced by static art when the OS
  "reduce motion" setting is on. A distinctive bundled typeface (chosen during implementation
  design pass) loads via expo-font with a safe fallback.
- **Rationale**: "Modern and designed" is the product's differentiator (FR-002, FR-017, SC-004).
  Tokens satisfy the constitution's no-magic-values rule; Reanimated keeps animation on the UI
  thread for 60 fps.
- **Alternatives considered**: @shopify/react-native-skia for richer shader-style effects (larger
  bundle and complexity; revisit if Reanimated cannot reach the desired quality); Lottie
  (asset-driven, harder to adapt to arbitrary conditions).

## R-8: Testing and quality tooling

- **Decision**:
  - **Unit**: Jest (jest-expo) for `domain`, `theme`, mappers.
  - **Component/integration**: React Native Testing Library with a fake `WeatherProvider`; queries
    use accessibility roles/labels, doubling as a11y checks.
  - **Contract**: recorded OpenWeather responses in `tests/contract/fixtures` validated by the same
    zod schemas used at runtime, plus mapper tests, including malformed/missing-field fixtures.
    CI never calls the live API; a separate manual/scheduled script may refresh fixtures.
  - **Visual**: RNTL snapshot tests for core components per condition/day-night/appearance; add
    screenshot regression later if snapshots prove too coarse.
  - **E2E**: Maestro flows for the main user journeys (simple YAML, works on simulators/emulators).
  - **Static**: ESLint (with react-native-a11y rules), Prettier, `tsc --noEmit`, coverage
    thresholds in Jest config, dependency audit in CI.
- **Rationale**: Maps one-to-one onto constitution Principle III layers and the failure-handling
  rules in Principle V.
- **Alternatives considered**: Detox (more setup, flakier on CI for this scale); Playwright/Web
  (not a target platform).

## R-9: State management

- **Decision**: No global state library. Server state in TanStack Query; small client state
  (preferences, saved places) in a minimal persisted store module under `src/data` exposed through
  hooks; component-local state otherwise.
- **Rationale**: The app's state is small and mostly server cache; adding a store library would be
  speculative (Principle IV, YAGNI).
- **Alternatives considered**: Zustand (acceptable later if shared client state grows); Redux
  (disproportionate).

## R-10: Location permission and search UX

- **Decision**: Request foreground location permission with `expo-location` on first launch after
  a short explanation; on denial route to the search-first empty state with a non-blocking prompt
  to enable it in settings (FR-012). Search is debounced (~300 ms), limited to 5 results, and shows
  region and country to disambiguate duplicates. Device coordinates are rounded to ~2 decimal
  places before being sent to the provider and are never logged.
- **Rationale**: Meets FR-012 and privacy rules; coarse coordinates are sufficient for weather
  and reduce what leaves the device.
- **Alternatives considered**: Always-on location (unneeded, privacy cost); IP-based location
  (less accurate, extra service).

## R-11: Error handling model

- **Decision**: The OpenWeather client classifies failures into a closed set:
  `offline`, `timeout`, `rate-limited`, `unauthorized`, `not-found`, `malformed-response`,
  `server-error`. Each maps to a user-facing state with retry where meaningful. Malformed or
  partially missing fields fail the zod schema only where the field is required; optional fields
  (e.g. UV, visibility, alerts) degrade to "unavailable" instead of failing the whole response.
- **Rationale**: Implements Principle V and FR-014 with a testable finite set of outcomes.
- **Alternatives considered**: Generic error with message string (not testable, poor UX).

## R-12: A keyless default provider (added after the first implementation)

- **Decision**: Open-Meteo is the default provider; OpenWeather stays supported and is chosen when an
  API key is configured. The fake provider remains for tests and design work. Selection is by
  environment (`EXPO_PUBLIC_WEATHER_PROVIDER`, then the key, then Open-Meteo).
- **Rationale**: OpenWeather One Call 3.0 needs an account, a payment method and a key that ships in
  the app, so a fresh checkout could not show real weather. Open-Meteo returns the same data (current,
  hourly, daily, sun times, UV, visibility) with no account or key. The adapter boundary made this a
  new provider rather than a change to the app.
- **Trade-offs**: Open-Meteo provides no official weather alerts (the banner only appears with
  OpenWeather or the fake), needs a second service (BigDataCloud) to name the device location, and its
  free tier is non-commercial.
- **Alternatives considered**: Nominatim and Photon for reverse geocoding (usage policies and noisier
  results than BigDataCloud's client endpoint).
