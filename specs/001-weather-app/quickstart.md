# Quickstart: Validating the W34th3r Weather App

A run-and-verify guide for the finished feature. It describes what to run and what to expect, not
how to implement it. Data shapes: [data-model.md](data-model.md). Contracts:
[contracts/](contracts/).

## Prerequisites

- Node.js LTS and a package manager (npm).
- iOS Simulator (Xcode) and/or Android Emulator (Android Studio), or Expo Go / a development build
  on a physical phone.
- An OpenWeather account subscribed to **One Call API 3.0** (the plan has a free daily allowance
  but requires a payment method). Set an account-level daily call cap.
- [Maestro](https://maestro.mobile.dev) CLI for end-to-end flows.

## 1. Configure

```bash
cp .env.example .env.local   # then set EXPO_PUBLIC_OPENWEATHER_API_KEY in .env.local
npm install
```

`.env.local` is git-ignored. The key must never be committed (constitution: Quality Standards).

## 2. Static checks and automated tests (no network required)

```bash
npm run lint          # ESLint (incl. a11y rules) + Prettier check
npm run typecheck     # tsc --noEmit, strict
npm test              # unit, component, integration, contract (fixtures only), snapshots
npm run test:coverage # fails if thresholds are not met (domain logic ≥ 90%)
```

Expected: all green; no test makes a live API call.

## 3. Verify the provider contract against the real API (manual, occasional)

```bash
npm run fixtures:refresh   # records fresh One Call + Geocoding responses into tests/contract/fixtures
npm test -- tests/contract
```

Expected: recorded responses still satisfy the schemas. If a field changed upstream, the contract
tests fail here, before users see it. Review fixture diffs before committing.

## 4. Run the app

```bash
npx expo start         # press i (iOS) or a (Android)
```

## 5. Manual validation scenarios (map to spec stories)

| # | Scenario | Expected result | Spec |
|---|----------|-----------------|------|
| 1 | Launch, grant location | Current place name, temperature, condition, feels-like, high/low in ≤ 3 s; theme matches condition and day/night | US1, FR-001/002, SC-001 |
| 2 | Simulate different conditions via the fake provider / dev menu (clear, rain, snow, night) | Visibly different themes; smooth transition when data changes | US1, FR-002 |
| 3 | Open hourly and daily forecasts | 24 hourly entries and 7 daily entries in order, with precip chance; correct day labels across midnight | US2, FR-003/004/007 |
| 4 | Search "Springfield" | Several results, disambiguated by region/country; selecting one shows its weather in its own local time | US3, FR-005/007 |
| 5 | Save two places, reorder, remove one, restart app | List persists in the saved order | US3, FR-006 |
| 6 | Search a nonsense string | "No places found" message with a spelling hint | US3 |
| 7 | Change temperature unit and wind unit; switch to dark appearance; restart | All screens update consistently; choices persist; dark mode legible | US4, FR-010/011 |
| 8 | Open details | Wind, humidity, UV, visibility, pressure, sunrise/sunset in the place's local time; alert flagged when present | US5, FR-008/009 |
| 9 | Deny location permission | App opens to search-first state with a gentle prompt to enable location; nothing blank or broken | FR-012 |
| 10 | Turn on airplane mode after a successful load, relaunch | Last known weather visible in ≤ 1 s with "Updated N min ago" | FR-014, SC-005 |
| 11 | Force provider errors (invalid key, timeout, 429, malformed JSON) with the fake provider | Each shows a friendly message with retry where meaningful; no crash or blank screen | FR-014, SC-008 |
| 12 | Enable OS "reduce motion", large text, and a screen reader | Ambient animation off/static; no press bounce, entrances, number pops or grabbable temperature (pressed controls only dim) and nothing hidden; layouts hold at largest text; all controls announced meaningfully | FR-015, FR-019, SC-006 |

## 6. End-to-end flows

```bash
maestro test tests/e2e
```

Expected: flows covering scenarios 1, 3, 4, 5, 7 and 10 pass on at least one iOS simulator and one
Android emulator, using the fake provider build variant so results are deterministic.

## Validation log

Recorded on 2026-10-20 on a Mac with Node 26, **without** Xcode, an Android emulator, Maestro, or an
OpenWeather key. Items marked "pending" still need a machine that has them.

| Step | Result |
|------|--------|
| 2. `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` | Pass. 872 tests; coverage 94.8% statements / 92.1% branches overall, `src/domain` 100%, `mappers.ts` ≥ 97% |
| 3. `npm run fixtures:refresh` and contract tests against real responses | **Pending** (needs a One Call 3.0 key). Fixtures were built from the documented response shape |
| 4. App bundles for iOS and Android | Pass: both compile to a 5.1 MB Hermes bundle. A web build of the home screen was checked visually in a browser |
| 5. Manual scenarios 1–12 on a device | **Pending**. Each scenario is covered by an automated integration test (see below) but has not been walked through on a simulator |
| 6. `npm run e2e` (Maestro) | **Pending**. Flows are written in `tests/e2e/` for every user story plus offline behaviour |

Automated coverage of the manual scenarios: 1–2 `tests/integration/current-conditions.test.tsx`;
3 `forecast.test.tsx`; 4–6 `places.test.tsx`; 7 `settings.test.tsx`; 8 `details.test.tsx`;
9 `places.test.tsx` and `failure-scenarios.test.tsx`; 10–11 `failure-scenarios.test.tsx`;
12 `accessibility.test.tsx`; time zones `time-zones.test.tsx`.

### Performance (constitution targets and SC-001, SC-005)

Not yet measured on a device. Still to do on a mid-range phone or emulator profile, with a real key
on a typical mobile connection:

- Current conditions visible within 3 s of launch (SC-001) and the primary view's first render within 2 s.
- Cached weather visible within 1 s of launch with the network off (SC-005).
- Ambient effects (rain, snow, clouds) holding a steady frame rate; if not, lower the particle counts
  in `src/theme/effects/*` (`MAX_DROPS`, `MAX_FLAKES`, wisp counts).

Known size: the JS bundle is 5.1 MB of Hermes bytecode on both platforms.
