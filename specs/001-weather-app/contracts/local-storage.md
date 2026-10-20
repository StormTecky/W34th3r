# Contract: Local Storage

On-device persistence. All keys are namespaced `w34th3r:` and each stored document carries a
`version` integer so future releases can migrate it. Reads MUST tolerate missing, corrupt, or
older-version data by falling back to defaults (never crashing); corrupt data is discarded and
logged without personal content.

| Key | Shape | Owner | Notes |
|-----|-------|-------|-------|
| `w34th3r:prefs` | `{ version: 1, temperatureUnit, windSpeedUnit, precipitationUnit, appearance, lastViewedPlaceId, hasSeenLocationPrompt }` | `features/settings` | Defaults per data model |
| `w34th3r:places` | `{ version: 1, places: Place[], viewed: Place \| null }` (saved places only, in display order; `viewed` is the place last opened from search or the list, saved or not) | `features/places` | Current location is not persisted; invalid or duplicate entries are dropped on read |
| `w34th3r:query-cache` | Serialized TanStack Query cache (buster: app version + schema version) | `src/data` | Holds `WeatherSnapshot`s; discarded when the buster changes; max age 7 days |

## Rules

- Writes are whole-document and happen after every user change (preferences, add/remove/reorder
  place). A failed write is surfaced as a non-blocking message; in-memory state remains valid.
- Saved places have no hard cap in v1; lists with 20+ entries must render efficiently (virtualized).
- No credentials, API keys, or device coordinates (other than saved places the user chose) are
  persisted.
- Clearing app data resets everything to defaults; no remote copy exists.
