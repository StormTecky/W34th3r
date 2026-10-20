# Contract: WeatherProvider (internal adapter)

The only interface the rest of the app uses to obtain weather data. `OpenWeatherProvider`
implements it today; tests use an in-memory fake; a different provider or a proxy can replace it
without changes to `domain`, `features`, or `app`. Types referenced are defined in
[data-model.md](../data-model.md). The signature below is illustrative of the contract, not final
code.

```ts
interface WeatherProvider {
  /** Weather for a place. Rejects with ProviderError. */
  getWeather(place: Pick<Place, "id" | "lat" | "lon">, opts?: { signal?: AbortSignal }): Promise<WeatherSnapshot>;

  /** Search places by free text. Empty array when nothing matches. Rejects with ProviderError. */
  searchPlaces(query: string, opts?: { signal?: AbortSignal }): Promise<Place[]>;

  /** Name for coordinates. Resolves null when no name is available. Rejects with ProviderError. */
  reverseGeocode(lat: number, lon: number, opts?: { signal?: AbortSignal }): Promise<Place | null>;
}

type ProviderErrorKind =
  | "offline" | "timeout" | "rate-limited" | "unauthorized"
  | "not-found" | "malformed-response" | "server-error";

class ProviderError extends Error { kind: ProviderErrorKind; }
```

## Behavioral guarantees (verified by contract tests against fixtures)

1. `getWeather` returns metric values and a `WeatherSnapshot` that satisfies every rule in the data
   model (ordering, counts ≤ 24/7, ranges, discriminated forecast entries).
2. Optional provider fields that are missing produce absent optional domain fields, never a thrown
   error and never `NaN`/`undefined` placed in required fields.
3. A response missing a required field rejects with `ProviderError("malformed-response")`.
4. Every failure is a `ProviderError` with exactly one kind from the closed set; no raw network or
   parsing errors escape the adapter. The only other rejection is the `AbortError` described below.
5. Aborting via `signal` rejects promptly with an `Error` named `AbortError` (not a `ProviderError`: a cancellation is not a failure) and does not populate any cache.
6. The adapter never logs API keys, coordinates, or search text.
7. `searchPlaces("")` / whitespace-only input resolves `[]` without a network call.

## Consumers

- `src/features/current`, `forecast`, `details`: call `getWeather` through query hooks.
- `src/features/places`: `searchPlaces`, `reverseGeocode`.
- Dependency injection: the provider is supplied once at the app root (React context) so tests
  can swap in a fake without module mocking.
