# W34th3r

A designed weather app, because most weather apps are ugly.

W34th3r shows the weather where you are, and for any place you search for, on a bold, illustrated
sky that changes with the conditions and the time of day. It is built with React Native (Expo) and
works on iOS and Android. Real weather works out of the box: the default provider is
[Open-Meteo](https://open-meteo.com), which needs no account and no key. OpenWeather is supported
as an alternative.

## What it does

- **Now**: temperature, conditions, feels-like, and today's high and low for your location.
- **Ahead**: the next 24 hours and 7 days, in the viewed place's own local time.
- **Places**: search for any place, view its weather, save places, reorder and remove them.
- **Details**: wind, UV index, humidity, visibility, pressure, sunrise and sunset, and official alerts.
- **Yours**: choose units (temperature, wind, precipitation) and light, dark, or system appearance.
- **In your language**: English or French, following the device: words, dates, times, numbers and the playful weather lines.
- **Any screen, any way up**: on a tablet or a phone on its side, the conditions sit beside the forecast, details show three tiles a row, and lists keep a readable width.
- **Dependable**: when the network fails it shows the last known weather with its age, never a blank screen.

The product spec, plan, and task list live in [`specs/001-weather-app/`](specs/001-weather-app/).
Project principles (code quality, testing, maintainability) are in
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

## Requirements

- **Node.js 22.13 or newer** (required by Expo SDK 58).
- A phone with **Expo Go**, an iOS Simulator (Xcode), or an Android emulator.
- Optional: an **OpenWeather account subscribed to One Call API 3.0** (free daily allowance, payment
  method required) if you prefer OpenWeather to Open-Meteo.
- Optional, for end-to-end tests: [Maestro](https://maestro.mobile.dev).

## Setup and running

```bash
npm install
npm start            # real weather from Open-Meteo: nothing else to configure
npm run start:fake   # deterministic fake weather, handy for design work and end-to-end tests
```

Then scan the QR code with Expo Go, or press `i` (iOS) or `a` (Android).

### Weather providers

| Provider                 | When it is used                                                          | Needs                             |
| ------------------------ | ------------------------------------------------------------------------ | --------------------------------- |
| **Open-Meteo** (default) | Nothing is configured                                                    | Nothing: no account, no key       |
| OpenWeather              | `EXPO_PUBLIC_OPENWEATHER_API_KEY` is set, or `npm run start:openweather` | One Call 3.0 key, in `.env.local` |
| Fake                     | `npm run start:fake`, or `EXPO_PUBLIC_WEATHER_PROVIDER=fake`             | Nothing                           |

Copy `.env.example` to `.env.local` to configure. `.env.local` is git-ignored; never commit a key.
Open-Meteo provides no official weather alerts, so the alert banner only appears with OpenWeather
(or the fake provider's alert scenario). Open-Meteo's free service is for non-commercial use; see
[open-meteo.com/en/pricing](https://open-meteo.com/en/pricing) before shipping commercially.

To check the real services through the app's own code: `npm run smoke:live`.

## Quality checks

```bash
npm run lint            # ESLint (including accessibility rules) and Prettier
npm run typecheck       # TypeScript, strict
npm test                # unit, component, integration, contract (recorded fixtures), snapshots
npm run test:coverage   # also enforces 90% line and branch coverage on domain logic and mappers
npm run e2e             # Maestro flows in tests/e2e (needs a simulator and a fake-provider build)
```

No test calls the live API. The Open-Meteo fixtures in `tests/contract/fixtures` are real recordings. To check the OpenWeather
fixtures against reality (needs a key):

```bash
npm run fixtures:refresh && npm test -- tests/contract
```

### End-to-end flows

The Maestro flows in `tests/e2e/` expect a fake-provider build (`npm run start:fake`) and a simulator
location near Paris. `offline-last-known.yaml` switches the fake provider to its offline scenario
through the deep link `w34th3r://dev/scenario?name=offline`. That link only affects fake-provider
builds.

## How it is organised

```text
app/        Routes (thin: each file re-exports a screen from src/features)
src/
  domain/     Pure TypeScript: types, units, conditions, time zones, freshness, language and texts
  providers/  The WeatherProvider adapter: Open-Meteo, OpenWeather, and a fake
  features/   current, forecast, details, places, settings (hooks and screens)
  theme/      Design tokens, weather themes, ambient effects
  ui/         Shared presentational components
  data/       Query cache and on-device storage
tests/        unit, contract, integration, e2e
```

`domain` imports nothing from React Native or the network, and only the code under `src/providers`
knows a provider's response shapes, so a provider can be replaced without touching the rest. Weather
is requested in metric and converted on the device, so changing units never refetches.

### Languages

English and French are supported. The app follows the device: it uses the first of the device's
preferred languages that it can translate (otherwise English), and keeps that locale's region for
formats, so `fr-FR` reads "14 h" and "5,5 m/s", `fr-CA` reads "14 h 42" and `en-GB` uses a 24-hour
clock. There is no in-app language picker yet; the app follows the device, even while it is open.
The Open-Meteo condition names, place names and the OpenWeather descriptions are requested in the
same language. Cached weather is kept per language, so after the device language changes the last
known weather appears again once the app is online.

Where the words live, and how to add a language (say Spanish):

1. Add `'es'` to `SUPPORTED_LANGUAGES` in `src/domain/locale.ts`. The compiler then reports every
   table that still needs a Spanish entry.
2. `src/domain/messages/es.ts`: all interface text, the mood lines, unit names and spoken
   descriptions. Copy `en.ts` and translate; functions (`minutesAgo(n)`) let a language choose its
   own word order.
3. `src/ui/error-messages.ts`: the friendly failure copy.
4. `src/providers/openmeteo/codes.ts`: the weather condition names for Open-Meteo's weather codes.
5. `locales/<language>.json` and `expo.locales` in `app.json`: the iOS location permission prompt,
   which the system shows, not the app. Android shows no custom text.

Tests fail until each table is complete, and the French catalog is also checked for untranslated
strings and for a no-break space before `! ? : ; %`. Not translated: text that comes from the weather
service itself (official alert headlines and descriptions), the fake provider's sample data, and
developer-facing log and configuration messages.

## Security

- **No key by default.** Open-Meteo needs none. If you use OpenWeather, the key ships inside the app,
  because a client-only app cannot hide it. Mitigations: it is never committed, you should set a daily
  call cap on the OpenWeather account, and all provider access is in one adapter so a small proxy can
  be added later without changing the app.
- **Privacy.** Location is used only to fetch weather. Coordinates are rounded to two decimals before
  leaving the device. With Open-Meteo they go to Open-Meteo (weather), and to BigDataCloud (to name
  your location); search text goes to Open-Meteo's geocoding. API keys, coordinates, and search text
  are never logged (the logger redacts them). There are no accounts and no analytics.
- **Known dependency advisories.** `npm audit` reports high-severity advisories for `braces` and
  `node-forge`, and moderate ones for `sprintf-js` and `uuid`. All are in build and test tooling
  (Metro, Expo CLI, Jest), none ships in the app, and upstream has no fixed version yet. CI fails on
  critical findings and these are reviewed at each Expo upgrade.

## Dependencies

Each runtime dependency has one job:

| Package                                                                                  | Why                                                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `expo`, `expo-router`, `expo-linking`, `expo-constants`, `expo-status-bar`               | App framework, file-based navigation and deep links                     |
| `expo-location`, `expo-localization`                                                     | Device location (coarse, foreground), language, formats, unit defaults  |
| `expo-font`, `expo-linear-gradient`                                                      | Bundled typeface (Outfit, SIL OFL) and the sky gradients                |
| `react-native-reanimated`, `react-native-worklets`                                       | Ambient weather effects on the UI thread                                |
| `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context` | Navigation and layout primitives required by expo-router                |
| `react-native-svg`                                                                       | Weather and interface icons, compass, sun arc                           |
| `@tanstack/react-query` (+ persist client and AsyncStorage persister)                    | Caching, the 15-minute refresh rule, and offline last-known data        |
| `@react-native-async-storage/async-storage`                                              | Saved places, preferences, cached weather                               |
| `zod`                                                                                    | Validating provider responses at the boundary                           |
| `react-dom`, `react-native-web`                                                          | Peer requirements of expo-router; also enable local web design previews |

Development tooling: TypeScript, Jest with `jest-expo`, React Native Testing Library, ESLint with the
Expo and React Native accessibility rules, Prettier, and `tsx` for the fixture script.

## Contributing

Changes go through pull requests that pass CI (lint, types, tests, coverage). Write a failing test
first; see the constitution for the full rules.
