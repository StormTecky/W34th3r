---

description: "Task list for the W34th3r Weather App"
---

# Tasks: W34th3r Weather App

**Input**: Design documents from `/specs/001-weather-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED. The project constitution (Principle II, Test-First, NON-NEGOTIABLE) requires a
failing test before implementation. Within every phase, test tasks come first: write them, run
them, confirm they fail for the expected reason, then implement. Principle III defines the layers
(unit, contract with recorded fixtures and no live calls, integration/E2E, snapshot + a11y).

**Organization**: Tasks are grouped by user story so each story can be implemented and tested
independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story the task belongs to (US1–US5); omitted in Setup, Foundational, Polish
- Every task names exact file paths

## Path Conventions

Single Expo (React Native) project at the repository root, per plan.md: `app/` (routes),
`src/domain|providers|features|theme|ui|data|config|lib`, `tests/unit|contract|integration|e2e`,
`assets/`, `scripts/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and quality gates (constitution Principle I)

- [X] T001 Scaffold an Expo TypeScript app at the repository root: run `npx create-expo-app` into a scratch directory with the blank TypeScript template, then move `package.json`, `app.json`, `tsconfig.json`, and starter config into the repo root without overwriting `README.md`, `LICENSE`, `specs/`, `.specify/`, or `.claude/`; delete the template's default `App.tsx`/`index.ts` entry in favor of expo-router (`"main": "expo-router/entry"` in `package.json`)
- [X] T002 Enable TypeScript strict mode in `tsconfig.json` (`"strict": true`, `noUncheckedIndexedAccess: true`) and add a `@/*` → `src/*` path alias, mirrored in `jest.config.js` (T004) and `babel.config.js` if required
- [X] T003 Install runtime dependencies (expo-router, expo-location, expo-localization, expo-font, expo-linear-gradient, react-native-reanimated, react-native-gesture-handler, react-native-safe-area-context, react-native-screens, @tanstack/react-query, @tanstack/react-query-persist-client, @tanstack/query-async-storage-persister, @react-native-async-storage/async-storage, zod) and dev dependencies (jest, jest-expo, @testing-library/react-native, @types/jest, eslint, eslint-plugin-react-native-a11y, prettier, typescript) using `npx expo install` where available; commit the lockfile (`package-lock.json`)
- [X] T004 [P] Configure Jest in `jest.config.js` and `jest.setup.ts` (jest-expo preset, RNTL matchers, AsyncStorage mock, `@/` alias, `collectCoverageFrom` for `src/**`, per-path coverage threshold of 90% lines and branches for `src/domain/**` and `src/providers/openweather/mappers.ts`, global threshold that must not decrease)
- [X] T005 [P] Configure ESLint and Prettier in `eslint.config.js` and `.prettierrc` (TypeScript rules, `react-native-a11y` rules, `no-console` except in `src/lib/logger.ts`, `@typescript-eslint/ban-ts-comment` requiring a description, `complexity` max 10, `max-lines-per-function` 40 as warnings per constitution)
- [X] T006 [P] Add `.env.example` (documents `EXPO_PUBLIC_OPENWEATHER_API_KEY` and `EXPO_PUBLIC_USE_FAKE_PROVIDER`) and ensure `.gitignore` excludes `.env.local`, `.env*.local`, `coverage/`, `.expo/`, and `node_modules/`
- [X] T007 [P] Configure `app.json`: app name "W34th3r", slug, orientation, `expo-router` and `expo-location` plugins with an iOS `NSLocationWhenInUseUsageDescription` message ("W34th3r uses your location only to show the weather where you are.") and Android coarse-location permission only, `userInterfaceStyle: "automatic"`
- [X] T008 Add `package.json` scripts: `lint` (eslint + `prettier --check`), `typecheck` (`tsc --noEmit`), `test` (jest), `test:coverage` (jest --coverage), `fixtures:refresh` (`tsx scripts/refresh-fixtures.ts`), `e2e` (`maestro test tests/e2e`)
- [X] T009 [P] Create CI workflow in `.github/workflows/ci.yml` running install, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, and `npm audit --audit-level=high` on every pull request; no live API key is provided to CI

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain model, provider adapter for weather data, storage, preferences, test doubles,
design tokens, and the app shell that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Domain types

- [X] T010 Define domain types in `src/domain/types.ts` exactly per data-model.md: `Place` (`id` string `"current"` or `"<lat>,<lon>"` rounded to 2 decimals; `lat` -90..90; `lon` -180..180; `name` non-empty; `region` string|null; `country`; `timeZone` string|null; `kind` `"current-location"|"saved"`; `sortOrder` number|null), `WeatherSnapshot`, `CurrentConditions` (required vs optional fields as in data-model), `ForecastEntry` as a discriminated union on `kind` (`"hour"` has `temperature`; `"day"` has `high`/`low`; `precipChance` 0–100), `WeatherAlert` (`severity` `"minor"|"moderate"|"severe"|"extreme"|"unknown"`), `ConditionCategory` (`clear`, `partly-cloudy`, `cloudy`, `drizzle`, `rain`, `thunderstorm`, `snow`, `sleet`, `mist-fog`, `dust-smoke`, `squall-tornado`, `unknown`), `UserPreferences`

### Pure domain logic (tests first)

- [X] T011 [P] Write failing unit tests in `tests/unit/domain/units.test.ts`: °C↔°F, m/s→km/h/mph/kn, mm→in, hPa, metres→km/mi, rounding rules, formatting with symbols, negative and extreme values (-40, 50), zero
- [X] T012 [P] Write failing unit tests in `tests/unit/domain/conditions.test.ts`: OpenWeather condition ids (2xx, 3xx, 5xx, 6xx, 7xx subcategories, 800, 801–804) → `ConditionCategory`, unmapped id → `unknown`, `isDay` derived from `observedAt` vs `sunrise`/`sunset` including exact boundary and polar day/night
- [X] T013 [P] Write failing unit tests in `tests/unit/domain/time.test.ts`: formatting of hour/day labels in a place's IANA zone across midnight, a DST transition inside the 7-day window (e.g. `America/New_York`, `Europe/London`), half-hour offset (`Asia/Kolkata`), date-line zones (`Pacific/Kiritimati`, `Pacific/Pago_Pago`), fallback to `timezone_offset` when the IANA zone is rejected; tests inject the clock
- [X] T014 [P] Write failing unit tests in `tests/unit/domain/freshness.test.ts`: `fresh` when age ≤ 15 min, `stale` when age > 15 min, boundary at exactly 15 min, "Updated N min ago" label text for minutes/hours/days
- [X] T015 [P] Write failing unit tests in `tests/unit/lib/logger.test.ts`: logger redacts `appid`/API keys, `lat`/`lon`/coordinates, and search text from messages and context objects
- [X] T016 [P] Implement `src/domain/units.ts` to pass T011 (depends on T010)
- [X] T017 [P] Implement `src/domain/conditions.ts` to pass T012 (depends on T010)
- [X] T018 [P] Implement `src/domain/time.ts` using `Intl.DateTimeFormat` with the IANA `timeZone` option, with offset fallback, to pass T013 (depends on T010)
- [X] T019 [P] Implement `src/domain/freshness.ts` (15-minute rule, age label) to pass T014 (depends on T010)
- [X] T020 [P] Implement `src/lib/logger.ts` with a redacting `log.debug|info|warn|error(message, context)` wrapper to pass T015

### Configuration

- [X] T021 [P] Write failing tests in `tests/unit/config/env.test.ts`: missing `EXPO_PUBLIC_OPENWEATHER_API_KEY` yields an explicit configuration error (never logs the key), `EXPO_PUBLIC_USE_FAKE_PROVIDER=1` selects the fake provider and does not require a key
- [X] T022 Implement `src/config/env.ts` (single access point for env config, base URL `https://api.openweathermap.org`, request timeout 10 s) to pass T021

### Provider adapter: One Call (contract tests first)

- [X] T023 Define `WeatherProvider` interface and `ProviderError` with the closed `ProviderErrorKind` set (`offline`, `timeout`, `rate-limited`, `unauthorized`, `not-found`, `malformed-response`, `server-error`) in `src/providers/weather-provider.ts` per contracts/weather-provider.md (all three methods declared: `getWeather`, `searchPlaces`, `reverseGeocode`)
- [X] T024 [P] Create One Call fixtures in `tests/contract/fixtures/`: `onecall-clear-day.json`, `onecall-rain-night.json`, `onecall-with-alerts.json`, `onecall-missing-optionals.json` (no `uvi`, `visibility`, `wind_deg`, `wind_gust`, no `alerts` key), `onecall-extreme.json` (-40 °C / 50 °C, 100% humidity, very high wind), `onecall-malformed.json` (missing `current.temp`), `onecall-empty-arrays.json` (empty `hourly`/`daily`), built from the shape documented in contracts/openweather-api.md
- [X] T025 [P] Create `scripts/refresh-fixtures.ts` that records live One Call and Geocoding responses into `tests/contract/fixtures/` using the key from `.env.local`, strips the `appid` from any saved URL, and refuses to run in CI
- [X] T026 [P] Write failing contract tests in `tests/contract/onecall.contract.test.ts`: every fixture passes/fails the zod schema as expected; mapper output satisfies data-model rules (hourly ≤ 24 and daily ≤ 7 entries, strictly ascending `start`, `precipChance` integer 0–100 from `pop` × 100, `humidity` 0–100, `windDirection` 0–359, `uvIndex` ≥ 0, `high`/`low` from `daily[0]`); missing optionals produce absent optional fields, never `NaN`; malformed fixture rejects with `malformed-response`; empty arrays reject with `malformed-response`; `alerts` absent → `[]`; alert severity mapping falls back to `unknown`
- [X] T027 [P] Write failing tests in `tests/contract/client-errors.test.ts` (mocked `fetch`): network failure → `offline`, no response within 10 s → `timeout`, 401 → `unauthorized`, 404 → `not-found`, 429 → `rate-limited` (no automatic hot-loop retry), 5xx → `server-error`, 2xx invalid body → `malformed-response`; at most one automatic retry for `timeout`/`server-error`; abort via `AbortSignal` rejects promptly; no raw errors escape; request URL with `appid` never appears in logs
- [X] T028 Implement zod schemas for the One Call response in `src/providers/openweather/schemas.ts` (required vs optional fields per contracts/openweather-api.md; non-strict objects) to pass T026 (depends on T024)
- [X] T029 Implement `src/providers/openweather/mappers.ts` (One Call → `WeatherSnapshot`, `isDay` from sunrise/sunset, condition mapping via `src/domain/conditions.ts`, `pop` → percentage, alert severity from `tags`) to pass T026 (depends on T017, T028)
- [X] T030 Implement `src/providers/openweather/client.ts` (fetch wrapper with `units=metric`, `exclude=minutely`, 10 s timeout, error classification, single retry for `timeout`/`server-error`, coordinates rounded to 2 decimals before sending, redacted logging) to pass T027 (depends on T020, T022, T023)
- [X] T031 Implement `OpenWeatherProvider.getWeather` in `src/providers/openweather/index.ts` (other methods throw a not-implemented `ProviderError` until US1/US3 add them) (depends on T029, T030)

### Storage, preferences, query cache (tests first)

- [X] T032 [P] Write failing tests in `tests/unit/data/storage.test.ts`: versioned document read/write under `w34th3r:` keys, missing/corrupt/older-version data falls back to defaults without throwing, failed write reports an error but leaves in-memory state valid, corrupt data discarded and logged without personal content
- [X] T033 Implement `src/data/storage.ts` (`readDocument`, `writeDocument` with `version`) to pass T032
- [X] T034 [P] Write failing tests in `tests/unit/features/settings/preferences-store.test.ts`: defaults derived from device region (US → `f`, `mph`, `in`; otherwise `c`, `kmh`, `mm`), `appearance` default `system`, `lastViewedPlaceId` default `"current"`, `hasSeenLocationPrompt` default `false`, persistence to `w34th3r:prefs`, update emits to subscribers
- [X] T035 Implement `src/features/settings/preferences-store.ts` and `usePreferences()` hook (uses `expo-localization` for region defaults, `src/data/storage.ts` for persistence) to pass T034 (depends on T033)
- [X] T036 [P] Write failing tests in `tests/unit/data/query-client.test.ts`: `staleTime` is 15 minutes, `gcTime` is 7 days, persisted cache is discarded when the buster (app version + schema version) changes, entries older than 7 days are dropped
- [X] T037 Implement `src/data/query-client.ts` and `src/data/persister.ts` (TanStack Query client + AsyncStorage persister under `w34th3r:query-cache`) to pass T036 (depends on T033)

### Test doubles and provider injection

- [X] T038 Implement the in-memory `FakeWeatherProvider` in `src/providers/fake/fake-provider.ts` with deterministic scenarios in `src/providers/fake/scenarios.ts` (clear-day, rain-night, snow, thunderstorm, extreme-values, missing-optionals, alerts-active, each error kind, slow response); scenarios are built from the domain types, not OpenWeather shapes (depends on T010, T023)
- [X] T039 Implement provider injection in `src/providers/provider-context.tsx` (`WeatherProviderContext`, `useWeatherProvider()`, default chosen from `src/config/env.ts`: real `OpenWeatherProvider` or `FakeWeatherProvider` when `EXPO_PUBLIC_USE_FAKE_PROVIDER=1`) (depends on T022, T031, T038)
- [X] T040 [P] Create test render helper in `tests/helpers/render.tsx` wrapping components with a fresh `QueryClient`, the fake provider (scenario selectable), preferences, and safe-area providers; export `renderWithProviders()` (depends on T035, T037, T039)

### Design foundation and app shell

- [X] T041 Define design tokens in `src/theme/tokens.ts`: light and dark neutral palettes (WCAG 2.2 AA contrast for text and meaningful graphics), type scale, spacing, radii, elevation, motion durations/easings; no magic values elsewhere
- [X] T042 [P] Select and bundle an open-license typeface (one display + one text weight set) in `assets/fonts/` and implement `src/theme/use-app-fonts.ts` (expo-font loading with a safe system-font fallback)
- [X] T043 [P] Write failing tests in `tests/unit/ui/ErrorState.test.tsx`: each `ProviderErrorKind` maps to a friendly non-technical message; retry button shown for `offline`, `timeout`, `rate-limited`, `server-error`, `malformed-response`; `unauthorized` shows a generic message and no retry; accessible roles/labels present
- [X] T044 Implement `src/ui/ErrorState.tsx` and `src/ui/error-messages.ts` to pass T043 (depends on T041)
- [X] T045 [P] Write failing tests in `tests/unit/ui/UpdatedAgoLabel.test.tsx` (renders "Updated N min ago" for stale data, nothing for fresh; accessible label), then implement `src/ui/UpdatedAgoLabel.tsx` using `src/domain/freshness.ts` (depends on T019, T041)
- [X] T046 [P] Implement `src/ui/Skeleton.tsx` loading placeholder using tokens and reduced-motion-safe shimmer (depends on T041)
- [X] T047 Implement the root layout in `app/_layout.tsx`: font loading gate, `QueryClientProvider` with persistence, `WeatherProviderContext`, safe-area/gesture-handler roots, system/light/dark appearance applied from preferences, expo-router `Stack` (depends on T035, T037, T039, T042)

**Checkpoint**: Foundation ready. `npm run lint`, `npm run typecheck`, and `npm test` pass; user story
work can begin.

---

## Phase 3: User Story 1 - See current conditions for my location at a glance (Priority: P1) 🎯 MVP

**Goal**: On launch with location permission granted, show place name, temperature, condition
summary, feels-like, and today's high/low, with a presentation (color, imagery, motion) that
reflects the condition and day/night. Includes refresh rules and failure states.

**Independent Test**: Launch with the fake provider and location granted; current conditions for
the device location appear with a theme matching the condition and time of day, update smoothly
when data changes, and show last-known data with its age when a refresh fails (spec US1, FR-001,
FR-002, FR-012–FR-014).

### Tests for User Story 1 (write first, confirm they FAIL)

- [X] T048 [P] [US1] Create fixtures `tests/contract/fixtures/geocoding-reverse.json` and `geocoding-reverse-empty.json` (shape per contracts/openweather-api.md section 3)
- [X] T049 [P] [US1] Write failing contract tests in `tests/contract/geocoding-reverse.contract.test.ts`: reverse result maps to `Place` (`state` → `region`, `kind` `"current-location"`, `id` `"current"`), empty array resolves `null`, malformed body → `malformed-response`
- [X] T050 [P] [US1] Write failing unit tests in `tests/unit/theme/theme-engine.test.ts`: every `(ConditionCategory, isDay)` pair returns a theme (gradient stops, accent, ambient effect preset); `unknown` returns the neutral fallback; day and night themes of the same condition differ; every theme's text/background pair meets WCAG AA contrast
- [X] T051 [P] [US1] Write failing snapshot tests in `tests/unit/theme/ConditionBackground.test.tsx` for each condition × day/night, with reduced motion on (static art) and off (ambient effect mounted)
- [X] T052 [P] [US1] Write failing tests in `tests/unit/features/places/use-device-location.test.ts`: permission undetermined → granted → coordinates rounded to 2 decimals; denied → `denied` state without throwing; re-check on app foreground; coordinates never logged
- [X] T053 [P] [US1] Write failing tests in `tests/unit/features/current/use-weather.test.tsx`: data older than 15 min triggers refetch on mount/foreground; fresh data does not; failed refetch keeps previous data and reports its age; first-load failure surfaces the `ProviderError` kind; manual refresh forces a fetch
- [X] T054 [P] [US1] Write failing integration tests in `tests/integration/current-conditions.test.tsx` (RNTL + fake provider): spec US1 acceptance scenarios 1–3 (all fields shown with preference units; rain-day theme differs from clear-day and rain-night; data change updates content), partial data (missing UV) does not break layout, extreme values (-40, 50, long place name) render without truncation of the temperature, location denied shows the permission state, each error kind shows `ErrorState`, screen-reader labels present on temperature/condition/high-low
- [X] T055 [P] [US1] Write Maestro flow `tests/e2e/us1-current-conditions.yaml` (fake provider build, location granted): launch → assert place name, temperature, condition, feels-like, high/low visible; pull to refresh; assert still visible

### Implementation for User Story 1

- [X] T056 [US1] Add reverse-geocoding to the OpenWeather adapter: zod schema in `src/providers/openweather/schemas.ts`, mapper in `src/providers/openweather/mappers.ts`, and `reverseGeocode` in `src/providers/openweather/index.ts` (`/geo/1.0/reverse?limit=1`) to pass T049 (depends on T031, T048)
- [X] T057 [P] [US1] Implement `src/theme/theme-engine.ts` mapping `(ConditionCategory, isDay)` → theme (gradient, accent, text colors, ambient effect preset) using `src/theme/tokens.ts`, to pass T050
- [X] T058 [P] [US1] Implement `src/theme/use-reduced-motion.ts` (OS reduce-motion setting as a hook)
- [X] T059 [P] [US1] Implement `src/theme/effects/RainEffect.tsx` (Reanimated worklet-driven drops; intensity prop for drizzle/rain/thunderstorm)
- [X] T060 [P] [US1] Implement `src/theme/effects/SnowEffect.tsx` (Reanimated flakes for snow/sleet)
- [X] T061 [P] [US1] Implement `src/theme/effects/CloudEffect.tsx` (slow-drifting cloud layers for cloudy/partly-cloudy/mist-fog)
- [X] T062 [US1] Implement `src/theme/ConditionBackground.tsx` (expo-linear-gradient + effect selection; cross-fade between themes when condition changes; static art when reduced motion is on) to pass T051 (depends on T057, T058, T059, T060, T061)
- [X] T063 [P] [US1] Implement `src/features/places/use-device-location.ts` (expo-location foreground permission, coarse accuracy, rounding to 2 decimals, foreground re-check, sets `hasSeenLocationPrompt`) to pass T052
- [X] T064 [US1] Implement `src/features/places/use-current-place.ts` (device coordinates + `reverseGeocode`; falls back to the generic label "Current location" when geocoding is empty or fails; weather still loads) (depends on T056, T063)
- [X] T065 [US1] Implement `src/features/current/use-weather.ts` (TanStack Query keyed by place id, `getWeather` from `useWeatherProvider()`, `staleTime` 15 min, refetch on app foreground, exposes `data`, `error` kind, `fetchedAt`, `refetch`, freshness) to pass T053 (depends on T019, T037, T039)
- [X] T066 [P] [US1] Implement `src/features/current/CurrentConditionsCard.tsx` (place name, large temperature, summary, feels-like, high/low in user units via `src/domain/units.ts`; accessible labels; handles long names and extreme values; smooth value transition respecting reduced motion) (depends on T016, T035, T041)
- [X] T067 [P] [US1] Implement `src/features/places/LocationPermissionState.tsx` (explains why location is used, grants via OS prompt, denied variant explains how to enable it in OS settings without nagging; the "search for a place" action is wired in US3) (depends on T041)
- [X] T068 [US1] Implement the Home screen in `app/index.tsx`: `ConditionBackground` + `CurrentConditionsCard` + `UpdatedAgoLabel` + `Skeleton` while loading + `ErrorState` on failure + `LocationPermissionState` when denied + pull-to-refresh; reads `lastViewedPlaceId` from preferences (defaults to the current-location place) to pass T054 (depends on T044, T045, T046, T062, T064, T065, T066, T067)
- [X] T069 [US1] Add structured logging calls (no coordinates, no keys) for location resolution and weather fetch outcomes in `src/features/current/use-weather.ts` and `src/features/places/use-current-place.ts`, using `src/lib/logger.ts`
- [ ] T070 [US1] Run T054 and T055 (Maestro with `EXPO_PUBLIC_USE_FAKE_PROVIDER=1`) and verify they pass; fix any gaps
  - Status: T054 passes (`npm test`). T055 (Maestro) is written but NOT yet run: Maestro and a full Xcode install are not available on this machine. Run `npm run e2e` on a machine with a simulator.

**Checkpoint**: User Story 1 is fully functional and testable on its own. This is the MVP.

---

## Phase 4: User Story 2 - Plan ahead with hourly and multi-day forecasts (Priority: P2)

**Goal**: Show an hourly view (next 24 hours) and a daily view (next 7 days) with temperature,
condition, and chance of precipitation, in the place's local time, visually consistent with the
Home screen.

**Independent Test**: With a weather snapshot available, open the forecast views and verify 24
hourly and 7 daily entries are present, ordered, correctly labeled in the place's local time
across midnight, and readable (spec US2, FR-003, FR-004, FR-007).

### Tests for User Story 2 (write first, confirm they FAIL)

- [X] T071 [P] [US2] Write failing unit tests in `tests/unit/features/forecast/forecast-view-model.test.ts`: builds hourly rows (time label in place zone, temperature, condition icon key, precip %) and daily rows (day name, high/low, condition, precip %); "Now" label for the first hour; "Today"/"Tomorrow" labels computed in the place's zone across midnight and DST; fewer than 24/7 entries render what exists
- [X] T072 [P] [US2] Write failing integration tests in `tests/integration/forecast.test.tsx`: spec US2 acceptance scenarios 1–3 using a fake provider scenario whose forecast crosses midnight in a non-device time zone; asserts 24 hourly and 7 daily rows in chronological order, preference units applied, accessible row labels read as a sentence ("Tuesday, high 18, low 9, 40 percent chance of rain")
- [X] T073 [P] [US2] Write failing snapshot tests in `tests/unit/ui/RangeBar.test.tsx` for the daily temperature-range bar (typical, negative, extreme, equal high/low)
- [X] T074 [P] [US2] Write Maestro flow `tests/e2e/us2-forecast.yaml`: launch → scroll to hourly strip → assert first entry "Now" → scroll to daily list → assert 7 rows

### Implementation for User Story 2

- [X] T075 [US2] Implement `src/features/forecast/forecast-view-model.ts` to pass T071 (depends on T016, T018)
- [X] T076 [P] [US2] Implement `src/ui/RangeBar.tsx` (daily low–high bar against the week's min/max, with a text alternative, not color-only) to pass T073 (depends on T041)
- [X] T077 [P] [US2] Implement `src/ui/ConditionIcon.tsx` (icon set keyed by `ConditionCategory` + `isDay`, decorative by default with a text label supplied by callers) (depends on T041)
- [X] T078 [US2] Implement `src/features/forecast/HourlyForecast.tsx` (horizontal 24-hour strip: time, icon, temperature, precip %) (depends on T075, T077)
- [X] T079 [US2] Implement `src/features/forecast/DailyForecast.tsx` (7-day list: day, icon, precip %, `RangeBar`) (depends on T075, T076, T077)
- [X] T080 [US2] Integrate `HourlyForecast` and `DailyForecast` into `app/index.tsx` below the current-conditions card, sharing the same `ConditionBackground`/tokens, to pass T072 (depends on T068, T078, T079)
- [ ] T081 [US2] Run T072 and T074 and verify they pass; fix any gaps
  - Status: T072 passes (`npm test`). T074 (Maestro) is written but NOT yet run: Maestro and a full Xcode install are not available on this machine.

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Check weather for other places (Priority: P2)

**Goal**: Search for a place by name, view its weather in its own local time, save places, and
reorder/remove them with persistence. Provides the search-first entry point when location is denied.

**Independent Test**: Search a known city, select it, verify conditions and forecasts appear in its
local time; save it and verify it persists across an app restart; verify "no places found" for
nonsense input and the search-first path with location denied (spec US3, FR-005–FR-007, FR-012).

### Tests for User Story 3 (write first, confirm they FAIL)

- [X] T082 [P] [US3] Create fixtures `tests/contract/fixtures/geocoding-direct.json` (several same-name results across regions/countries, including a non-Latin name) and `geocoding-empty.json`
- [X] T083 [P] [US3] Write failing contract tests in `tests/contract/geocoding-direct.contract.test.ts`: results map to `Place` with `region` (from `state`) and `country`; `id` is `"<lat>,<lon>"` rounded to 2 decimals; lat/lon outside -90..90 / -180..180 rejected; empty array → `[]` (not an error); whitespace-only query resolves `[]` with no network call; malformed body → `malformed-response`
- [X] T084 [P] [US3] Write failing unit tests in `tests/unit/features/places/places-store.test.ts`: add, saving a duplicate `id` is a no-op ("no two saved places share an `id`"), remove, reorder updates `sortOrder`, persistence to `w34th3r:places` with `version: 1`, corrupt/missing storage yields an empty list, `name` non-empty enforced, current location never persisted, 50+ places supported
- [X] T085 [P] [US3] Write failing unit tests in `tests/unit/features/places/use-place-search.test.tsx`: input debounced by ~300 ms, at most 5 results, previous in-flight request aborted on new input, results cached for the session, search text never logged, error kinds surfaced
- [X] T086 [P] [US3] Write failing integration tests in `tests/integration/places.test.tsx`: spec US3 acceptance scenarios 1–4 (disambiguated results; selecting shows that place's weather in its own local time; saved places persist after simulated restart; "no places found" message with spelling hint), location-denied launch shows search-first state whose action opens search, 20+ saved places render in a virtualized list, reorder/remove via accessible controls
- [X] T087 [P] [US3] Write Maestro flow `tests/e2e/us3-places.yaml`: search "Springfield" → pick a result → assert place name and local time shown → save → relaunch → assert it appears in saved list

### Implementation for User Story 3

- [X] T088 [US3] Add `searchPlaces` to the OpenWeather adapter: zod schema in `src/providers/openweather/schemas.ts`, mapper in `src/providers/openweather/mappers.ts`, and method in `src/providers/openweather/index.ts` (`/geo/1.0/direct?limit=5`, empty/whitespace query returns `[]` without a request) to pass T083 (depends on T056, T082)
- [X] T089 [US3] Implement `src/features/places/places-store.ts` and `usePlaces()` (versioned `w34th3r:places` document via `src/data/storage.ts`) to pass T084 (depends on T033)
- [X] T090 [P] [US3] Implement `src/features/places/use-place-search.ts` (debounce, abort, session cache) to pass T085 (depends on T039)
- [X] T091 [P] [US3] Implement `src/features/places/PlaceResultRow.tsx` (name, region, country, accessible label; optional "saved" state) (depends on T041)
- [X] T092 [US3] Implement the Search screen in `app/search.tsx` (text input, results list, empty "no places found" message with spelling suggestion, error state, select → sets `lastViewedPlaceId` and navigates Home, save action) (depends on T044, T089, T090, T091)
- [X] T093 [US3] Implement the Saved places screen in `app/places.tsx` (virtualized `FlatList`; each row shows name and current temperature when cached; select to view; edit mode with accessible move-up/move-down and remove controls; current-location entry pinned first) (depends on T089, T091)
- [X] T094 [US3] Update `app/index.tsx` to render the selected place (from `lastViewedPlaceId`: the current-location place or a saved place), using the place's `timeZone` for all displayed times, and add navigation entry points to Search and Saved places (depends on T080, T092, T093)
- [X] T095 [US3] Wire the `LocationPermissionState` "search for a place" action in `src/features/places/LocationPermissionState.tsx` to `app/search.tsx` so a denied-permission launch lands in the search-first flow (depends on T067, T092)
- [ ] T096 [US3] Run T086 and T087 and verify they pass; fix any gaps
  - Status: T086 passes (`npm test`). T087 (Maestro) is written but NOT yet run: Maestro and a full Xcode install are not available on this machine.

**Checkpoint**: User Stories 1–3 each work independently.

---

## Phase 6: User Story 4 - Choose units and appearance preferences (Priority: P3)

**Goal**: Choose temperature, wind speed, and precipitation units and light/dark/system
appearance; apply everywhere and persist.

**Independent Test**: Change temperature unit and appearance in Settings; every screen reflects the
change and persists after restart (spec US4, FR-010, FR-011).

### Tests for User Story 4 (write first, confirm they FAIL)

- [X] T097 [P] [US4] Write failing integration tests in `tests/integration/settings.test.tsx`: spec US4 acceptance scenarios 1–2 (switching °C↔°F updates current, hourly, daily values consistently without a refetch; selecting dark applies dark tokens on Home, Search, Places, Details, Settings), settings persist after simulated restart, `system` follows the OS scheme
- [X] T098 [P] [US4] Write failing snapshot tests in `tests/unit/theme/appearance.test.tsx` for primary components in light and dark, asserting AA contrast for text/background pairs from `src/theme/tokens.ts`
- [X] T099 [P] [US4] Write Maestro flow `tests/e2e/us4-settings.yaml`: open Settings → switch to °F and dark → assert Home values and appearance → relaunch → assert persisted

### Implementation for User Story 4

- [X] T100 [P] [US4] Implement `src/features/settings/SegmentedControl.tsx` (accessible selection control, ≥ 44 pt touch targets, token-based) (depends on T041)
- [X] T101 [US4] Implement the Settings screen in `app/settings.tsx` (temperature, wind speed, precipitation units; appearance system/light/dark; shows the units' current defaults) writing through `usePreferences()` to pass T097 (depends on T035, T100)
- [X] T102 [US4] Apply the appearance preference app-wide: provide a `useTheme()` hook in `src/theme/use-theme.ts` that resolves light/dark tokens from preferences or the OS scheme, and replace direct token reads in existing components with it to pass T098 (depends on T047, T101)
- [X] T103 [US4] Add a Settings entry point to `app/index.tsx` and ensure every formatter call site uses `usePreferences()` units (current, hourly, daily, saved places) (depends on T094, T101)
- [ ] T104 [US4] Run T097 and T099 and verify they pass; fix any gaps
  - Status: T097 passes (`npm test`). T099 (Maestro) is written but NOT yet run: Maestro and a full Xcode install are not available on this machine.

**Checkpoint**: User Stories 1–4 each work independently.

---

## Phase 7: User Story 5 - Understand more detail when I want it (Priority: P3)

**Goal**: A details view with wind speed/direction, humidity, UV index, visibility, pressure,
sunrise/sunset in the place's local time, and visible weather alerts.

**Independent Test**: Open details for a place; every detail is present, in the selected units, with
a visual aid; an active alert is flagged and its full text opens on demand (spec US5, FR-008, FR-009).

### Tests for User Story 5 (write first, confirm they FAIL)

- [X] T105 [P] [US5] Write failing unit tests in `tests/unit/features/details/details-view-model.test.ts`: wind degrees → compass label (N, NNE … NNW, wrap at 0/359), UV index → category (low/moderate/high/very high/extreme) with advice text, visibility and pressure formatted in user units, sunrise/sunset in place-local time, absent `uvIndex`/`visibility`/`windGust` shown as "unavailable" without breaking layout
- [X] T106 [P] [US5] Write failing integration tests in `tests/integration/details.test.tsx`: spec US5 acceptance scenarios 1–2 (all details present with units; alert banner visible on Home and Details when `alerts-active` scenario is used, severity distinguishable without color alone, tapping opens full description; no alert → no banner), missing-optionals scenario renders cleanly
- [X] T107 [P] [US5] Write failing snapshot tests in `tests/unit/ui/DetailWidgets.test.tsx` for `WindCompass`, `UVMeter`, `SunArc` (typical, extreme, missing data)
- [X] T108 [P] [US5] Write Maestro flow `tests/e2e/us5-details.yaml`: open details → assert wind, humidity, UV, visibility, pressure, sunrise, sunset labels visible

### Implementation for User Story 5

- [X] T109 [US5] Implement `src/features/details/details-view-model.ts` to pass T105 (depends on T016, T018)
- [X] T110 [P] [US5] Implement `src/features/details/WindCompass.tsx` (direction arrow + speed + gust, text alternative)
- [X] T111 [P] [US5] Implement `src/features/details/UVMeter.tsx` (scale with category label, not color-only)
- [X] T112 [P] [US5] Implement `src/features/details/SunArc.tsx` (sunrise/sunset arc with current sun position, place-local times)
- [X] T113 [P] [US5] Implement `src/features/details/AlertBanner.tsx` and `src/features/details/AlertSheet.tsx` (severity icon + label + color, on-demand full text with sender and effective period)
- [X] T114 [US5] Implement the Details screen in `app/details/[placeId].tsx` (composes the widgets, humidity and pressure tiles, alerts, uses the same `ConditionBackground`) to pass T106 and T107 (depends on T109, T110, T111, T112, T113)
- [X] T115 [US5] Add `AlertBanner` and a "Details" entry point to `app/index.tsx` (depends on T103, T113, T114)
- [ ] T116 [US5] Run T106 and T108 and verify they pass; fix any gaps
  - Status: T106 passes (`npm test`). T108 (Maestro) is written but NOT yet run: Maestro and a full Xcode install are not available on this machine.

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story quality gates from the constitution and spec success criteria

- [X] T117 [P] Write and pass `tests/integration/accessibility.test.tsx`: for Home, Search, Saved places, Details, and Settings, assert every interactive element has a role and label, touch targets ≥ 44 pt, text scales at the largest supported font size without clipped primary values, reduced motion disables ambient effects, information is not conveyed by color alone (SC-006, FR-015)
- [X] T118 [P] Write and pass `tests/integration/failure-scenarios.test.tsx`: for each fake scenario (offline, timeout, rate-limited, unauthorized, not-found, malformed-response, server-error, partial data, denied location) no screen crashes or renders blank, and cached data is shown with its age when available (SC-008, FR-014)
- [X] T119 [P] Write Maestro flow `tests/e2e/offline-last-known.yaml`: load weather, enable the offline fake scenario, relaunch → assert last-known data and "Updated N min ago" appear (SC-005)
  - Note: the flow switches the fake provider to offline in-session through `w34th3r://dev/scenario?name=offline` and pull-to-refresh, instead of relaunching, because the fake scenario is not persisted across launches. Relaunch-with-cache is covered by `tests/integration/current-conditions.test.tsx` and `failure-scenarios.test.tsx`. Maestro itself has not been run here.
- [X] T120 [P] Write and pass `tests/integration/time-zones.test.tsx`: Places in at least five time zones (including a DST-crossing forecast, a half-hour offset, and a date-line zone) show correct local times and unit conversions on Home and Details (SC-007)
- [ ] T121 Measure and record launch performance on a mid-range device or emulator profile: current conditions visible ≤ 3 s with a live connection, cached data visible ≤ 1 s, primary view initial render ≤ 2 s; record results and any regressions in `specs/001-weather-app/quickstart.md` notes (SC-001, SC-005, constitution Performance)
  - Status: NOT done. Needs a device or emulator profile and a real API key; neither is available on this machine. The measurement plan and the known bundle size are recorded in `quickstart.md` ("Performance").
- [ ] T122 Verify the ambient effects hold a steady frame rate on a mid-range device and degrade gracefully (reduced particle counts) if not; adjust `src/theme/effects/*` (depends on T121)
  - Status: NOT done. Depends on T121 (needs a device to observe frame rate).
- [X] T123 [P] Replace the placeholder `README.md` content with project description, setup (including the One Call 3.0 subscription prerequisite and call cap), environment variables, and `lint`/`typecheck`/`test`/`e2e` commands
- [X] T124 [P] Security review: confirm no API key or coordinates in logs, bundle, or committed files (search repository and run `git log -p` for `appid`), `.env.local` ignored, `npm audit` clean at high severity, dependencies each justified in `README.md`
- [X] T125 Run the full coverage gate (`npm run test:coverage`) and confirm domain logic and mappers ≥ 90% lines and branches and that overall coverage did not decrease; add tests for any gaps
- [X] T126 Run a complexity and cleanup pass: resolve ESLint complexity/length warnings or document why in comments, remove dead code and unused dependencies, and confirm no duplicated styling values outside `src/theme/tokens.ts`
- [ ] T127 Run the quickstart.md validation end to end (steps 2–6, scenarios 1–12) on iOS and Android and record results
  - Status: PARTIAL. Step 2 (lint, types, tests, coverage) passes and iOS/Android bundles compile. Steps 3, 5 and 6 are pending: they need an OpenWeather key, a simulator, and Maestro. Results are in the "Validation log" of `quickstart.md`.

### Localization: English and French (FR-018)

- [X] T128 [P] Write and pass `tests/unit/domain/locale.test.ts` and `tests/unit/domain/messages.test.ts`: language and locale resolution from the device's preferred locales, every catalog has the same entries as English, no untranslated French strings, no-break space before `! ? : ; %`
- [X] T129 [P] Add French cases to the domain tests (`mood`, `freshness`, `time`, `units`) and implement `src/domain/locale.ts`, `src/domain/messages/` and the `locale` parameter of the domain formatters
- [X] T130 [P] Add French cases to `details-view-model.test.ts` and `forecast-view-model.test.ts`; localize both view-models and the compass, UV, alert and precipitation texts
- [X] T131 [P] Write and pass `tests/contract/localization.contract.test.ts`: `RequestOptions.locale` selects the Open-Meteo `language` and `localityLanguage`, the OpenWeather `lang` and `local_names`, and the French WMO names; implement in `src/providers/`
- [X] T132 Write and pass the hook tests (`query-client`, `use-weather`, `use-place-search`, `use-current-place`, `use-locale`): the locale reaches the provider, the weather cache is keyed per language (`CACHE_SCHEMA_VERSION` 2), `useDeviceLocale` follows the device
- [X] T133 Localize every screen and component through `useLocale()` (`src/lib/use-locale.tsx`), mount `LocaleProvider` in `app/_layout.tsx`, and move the failure copy to `src/ui/error-messages.ts` per language
- [X] T134 Write and pass `tests/integration/localization.test.tsx` and run `accessibility.test.tsx` in both languages: French Home, Details, Places, Search, Settings, failure states, stale-data age and location prompts
- [X] T135 [P] Localize the iOS location permission prompt (`locales/fr.json`, `expo.locales` in `app.json`) with a config test; document how to add a language in `README.md`
- [ ] T136 Check on an iOS and an Android device or simulator set to French (and to a language that is not translated): permission prompt text, 24-hour clock, decimal comma, no-break spaces, nothing clipped at large text sizes. Maestro flows in `tests/e2e/` assert English text and need an English device

### Spring animations (FR-019)

- [X] T137 [P] Add the `spring` configs, `pressedScale`, `pressedScaleWide`, `popScale`, `enterRise` and `enterStagger` to `motion` and the `opacity` tokens in `src/theme/tokens.ts`; test that every spring is under-damped but settles and that the scales stay subtle (`tests/unit/theme/tokens.test.ts`)
- [X] T138 [P] Write and pass `tests/unit/ui/PressableScale.test.tsx`, `EnterView.test.tsx` and `BounceText.test.tsx` (with `tests/helpers/motion.ts` to read Reanimated's style under fake timers): press shrinks and dims then springs back past 1, entrances rise with overshoot and wait their turn, a changed number pops and settles, nothing scales or hides under reduced motion; implement `src/ui/PressableScale.tsx`, `EnterView.tsx` and `BounceText.tsx`
- [X] T139 Write and pass `tests/integration/motion.test.tsx`, then use the components: `PressableScale` in every button, row and banner (`IconButton`, `ErrorState`, `SegmentedControl`, `SavedPlaceRow`, `PlaceResultRow`, `LocationPermissionState`, `AlertBanner`, `AlertSheet`, Places), `EnterView` for the Home hero and forecast cards, Details tiles, Settings sections and the Places and Search bodies, `BounceText` for the hero temperature and the Details readings; update the `appearance` snapshots (additions only)
- [ ] T140 Check on an iOS and an Android device or simulator that the springs feel subtle at 60 fps (a long Places list, scrubbing the time-travel bar with the hero temperature popping) and that turning on "reduce motion" while the app runs stills them
- [X] T142 Write and pass `tests/unit/ui/Grabbable.test.tsx` and extend `tests/integration/motion.test.tsx`: grabbing follows the pointer, lifts by `popScale`, turns by `motion.grabTilt` degrees per point sideways, keeps hold over the scroll view, springs back with overshoot on release or termination, and cannot be grabbed under reduced motion; implement `src/ui/Grabbable.tsx` with React Native's responder system (as `ScrubBar` does) and wrap the hero temperature in it

### Fix: location on the web (FR-012)

- [X] T141 Write and pass tests (`current-conditions.test.tsx`, `LocationPermissionState.test.tsx`, `use-device-location.test.tsx`) and fix: in a browser the denied state no longer offers "Open Settings" (react-native-web has no `Linking.openSettings`, so pressing it crashed); it explains how to allow the site and offers "Try again" and search. A web permission request that fails without a refusal (expo-location returns GRANTED but not granted) now reads as unavailable instead of asking again

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately. T003 follows T001–T002; T008 follows T003.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories.
- **User Stories (Phase 3–7)**: All depend on Foundational completion. After that:
  - US1 (P1) has no story dependencies; it is the MVP.
  - US2 (P2) integrates into `app/index.tsx` created in US1 (T080 depends on T068) but its view-model, widgets, and tests are independent.
  - US3 (P2) adds the search/saved flows; T094 and T095 edit files created in US1/US2.
  - US4 (P3) depends on the preferences store (Foundational) and touches `app/index.tsx` after US3.
  - US5 (P3) is independent apart from the shared `app/index.tsx` entry point.
- **Polish (Phase 8)**: Depends on all desired stories being complete.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (constitution Principle II)
- Pure logic and view-models before components, components before screens, screens before integration into `app/index.tsx`
- A story's final task re-runs its integration and E2E tests

### Notable Task Dependencies

- Domain impl tasks T016–T019 depend on their tests T011–T014 and on T010
- Provider tasks: T024 → T026 → T028 → T029 → T031; T027 → T030 → T031
- T040 (test render helper) is needed by all integration tests (T054, T072, T086, T097, T106, T117–T120)
- `app/index.tsx` edit order: T068 (US1) → T080 (US2) → T094 (US3) → T103 (US4) → T115 (US5)
- `src/providers/openweather/{schemas,mappers,index}.ts` edit order: T028/T029/T031 → T056 (US1) → T088 (US3)

### Parallel Opportunities

- Setup: T004, T005, T006, T007, T009 together after T003
- Foundational: all test tasks T011–T015, T021, T024–T027, T032, T034, T036 together; then impl tasks T016–T020 together
- Each story's test tasks (all marked [P]) can be written together
- US1 effects T059–T061 together; US5 widgets T110–T113 together
- After Foundational, different developers can take US2, US3, US5 in parallel once US1's Home screen (T068) exists, coordinating edits to `app/index.tsx`

---

## Parallel Example: User Story 1

```bash
# Write all failing tests for User Story 1 together:
Task: "Contract tests for reverse geocoding in tests/contract/geocoding-reverse.contract.test.ts"
Task: "Theme engine unit tests in tests/unit/theme/theme-engine.test.ts"
Task: "ConditionBackground snapshot tests in tests/unit/theme/ConditionBackground.test.tsx"
Task: "use-device-location tests in tests/unit/features/places/use-device-location.test.ts"
Task: "use-weather tests in tests/unit/features/current/use-weather.test.tsx"
Task: "Integration tests in tests/integration/current-conditions.test.tsx"

# Then build the independent visual pieces together:
Task: "RainEffect in src/theme/effects/RainEffect.tsx"
Task: "SnowEffect in src/theme/effects/SnowEffect.tsx"
Task: "CloudEffect in src/theme/effects/CloudEffect.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run T054/T055 and quickstart scenarios 1, 2, 9, 10, 11 against the fake provider, then once against the live API (after quickstart step 3 confirms the fixtures match reality)
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test independently → demo (MVP)
3. US2 (forecasts) → test independently → demo
4. US3 (places) → test independently → demo
5. US4 (settings) and US5 (details) → test independently → demo
6. Polish → full quickstart validation → release candidate

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After US1's Home screen (T068) exists, developers take US2, US3, and US5 in parallel; US4 follows US3
3. Serialize edits to `app/index.tsx` and the shared OpenWeather adapter files per the order above

---

## Notes

- [P] tasks touch different files and have no dependency on an incomplete task
- [Story] labels map tasks to spec user stories for traceability
- Verify each test fails for the expected reason before implementing (Red → Green → Refactor)
- Commit after each task or logical group; keep PRs small and focused per the constitution
- The OpenWeather field names in `contracts/openweather-api.md` were written from documentation
  knowledge; run `npm run fixtures:refresh` (T025) with a real key early and reconcile fixtures and
  schemas before relying on them
