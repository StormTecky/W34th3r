# Implementation Plan: W34th3r Weather App

**Branch**: `001-weather-app` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-weather-app/spec.md`

## Summary

Build a phone-first, design-led weather app in **React Native (Expo, TypeScript)** backed by the
**OpenWeather API**. One Call API 3.0 supplies current conditions, 48 h hourly, 8-day daily
forecasts and alerts; the Geocoding API supplies place search and reverse geocoding. All provider
access sits behind a `WeatherProvider` adapter that validates responses (zod) and maps them to
the app's own domain types, so UI and domain code never see OpenWeather's shapes. Data is fetched
in metric units and converted on the device, so unit changes never refetch. TanStack Query with a
persisted cache provides stale-while-revalidate, the 15-minute refresh rule, and the
offline "last known data, marked with its age" behavior. The visual identity comes from central
design tokens and a condition/day-night theme engine that drives gradients and Reanimated-based
motion, honoring reduced-motion settings.

## Technical Context

**Language/Version**: TypeScript (strict mode) on the current stable Expo SDK / React Native
(New Architecture, Hermes) at scaffold time; Node LTS for tooling

**Primary Dependencies**: Expo SDK, expo-router (navigation), expo-location, expo-font,
expo-linear-gradient, react-native-reanimated, react-native-gesture-handler,
@tanstack/react-query (+ async-storage persister), zod (provider response validation),
@react-native-async-storage/async-storage

**Storage**: On-device key-value storage (AsyncStorage) for saved places, user preferences, and
the persisted query cache; no server-side storage, no accounts

**Testing**: Jest (jest-expo preset) + React Native Testing Library (unit, component, integration,
snapshot, a11y queries); recorded OpenWeather fixtures + zod schema checks for contract tests;
Maestro for end-to-end flows; ESLint (incl. react-native-a11y rules) + Prettier + `tsc --noEmit`

**Target Platform**: iOS and Android phones (Expo-supported OS versions at scaffold time), layout
adapts to tablets and landscape (FR-020). Web is not targeted in v1.

**Project Type**: mobile-app (single Expo project at repository root; no backend in v1)

**Performance Goals**: Current conditions visible ≤ 3 s after launch on a typical mobile
connection (SC-001); cached data visible ≤ 1 s (SC-005); primary view initial render ≤ 2 s on a
mid-range device (constitution); animations at a steady 60 fps on the UI thread

**Constraints**: Offline-tolerant (last known data); free/low-tier OpenWeather quota (One Call 3.0
free allowance of 1,000 calls/day) → cache aggressively and avoid redundant calls; location
used only to fetch weather; no accounts; API key supplied via environment config, never
committed; WCAG 2.2 AA; reduced-motion respected

**Scale/Scope**: Single user per device; ~6 screens (Home/current, Hourly & Daily forecast,
Details, Search, Saved places, Settings); tens of saved places at most

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Standard | Gate | Status |
|----------------------|------|--------|
| I. Code Quality | Formatter, linter, strict TS configured and enforced in CI; escape hatches commented | PASS (tooling chosen in Technical Context; set up in first task) |
| II. Test-First | Tasks ordered test → implement; bug fixes start with a failing test | PASS (to be reflected in `tasks.md` ordering) |
| III. Layered Testing | Unit, contract (recorded fixtures, no live calls), integration/E2E per flow, snapshot + a11y checks | PASS (see research R-8, quickstart) |
| IV. Maintainability & Simplicity | Provider behind adapter; domain/data/UI separable; central design tokens; justified deps | PASS (see structure and research R-3, R-9) |
| V. Reliable Failure Handling | Defined, tested behavior for network/timeouts/rate limits/malformed/missing data; stale data marked with age | PASS (see data-model "Freshness", contracts) |
| Quality Standards | Coverage floor 90% on domain logic; complexity limits; WCAG AA; secrets not committed; lockfile + vuln scan | PASS (enforced in CI; secrets via env config, see Risk below) |
| Workflow | PR-only, CI gates, spec traceability | PASS (process; no design impact) |

**Known risk (not a violation)**: a client-only app bundles the OpenWeather key in the shipped
binary, where it can be extracted. v1 mitigates by (a) keeping the key out of source control,
(b) configuring a daily call cap on the OpenWeather account so abuse is bounded, and (c) isolating
the provider behind the adapter so a thin proxy can be introduced later without touching domain
or UI code. See research R-2.

**Post-design re-check (after Phase 1)**: All gates still PASS. No complexity violations
require justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-weather-app/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── openweather-api.md      # External API surface we consume (endpoints, fields, errors)
│   ├── weather-provider.md     # Internal adapter contract the app depends on
│   └── local-storage.md        # Persisted data keys, shapes, versioning
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/                          # expo-router routes (thin: compose features, no logic)
├── _layout.tsx
├── index.tsx                 # Home: current conditions + hourly + daily
├── details/[placeId].tsx     # Details view
├── search.tsx
├── places.tsx                # Saved places
└── settings.tsx

src/
├── domain/                   # Pure TypeScript, no React Native or network imports
│   ├── types.ts              # Place, CurrentConditions, ForecastEntry, WeatherAlert, Preferences
│   ├── units.ts              # Metric → user-unit conversion and formatting
│   ├── conditions.ts         # Condition categories and day/night resolution
│   ├── time.ts               # Place-local time formatting (IANA time zone)
│   └── freshness.ts          # Data age and staleness rules (15 min refresh)
├── providers/
│   ├── weather-provider.ts   # WeatherProvider interface (the adapter contract)
│   └── openweather/
│       ├── client.ts         # HTTP calls, timeouts, error classification
│       ├── schemas.ts        # zod schemas for the API responses we use
│       ├── mappers.ts        # API shapes → domain types
│       └── index.ts          # OpenWeatherProvider implements WeatherProvider
├── features/
│   ├── current/              # Current-conditions hooks and components
│   ├── forecast/             # Hourly and daily forecast
│   ├── details/              # Wind, UV, humidity, visibility, pressure, sun, alerts
│   ├── places/               # Search, saved places, current-location handling
│   └── settings/             # Units and appearance
├── theme/                    # Design tokens, condition/day-night theme engine, motion presets
├── ui/                       # Shared presentational components (cards, charts, icons, skeletons)
├── data/                     # Query client + persistence, preference/place stores
└── config/                   # Environment config access (API key, base URLs)

tests/
├── unit/                     # domain/, theme/, mappers
├── contract/                 # OpenWeather fixtures + schema/mapper checks
│   └── fixtures/
├── integration/              # Feature-level flows with the provider faked
└── e2e/                      # Maestro flows

assets/                       # Fonts, icons, imagery
```

**Structure Decision**: A single Expo (React Native) project at the repository root with no
backend. Layers are separated by directory: `domain` (pure logic) ← `providers` (OpenWeather
adapter) ← `features` (use-cases and screens' logic) ← `app` (routing only), with `theme` and `ui`
as shared presentation. `domain` MUST NOT import from `providers`, `features`, or React Native,
which keeps it unit-testable and provider-independent (constitution Principle IV).

## Complexity Tracking

No constitution violations to justify.
