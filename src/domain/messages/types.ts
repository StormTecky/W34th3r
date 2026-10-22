import type {
  AlertSeverity,
  Appearance,
  ConditionCategory,
  PrecipitationUnit,
  TemperatureUnit,
  UvCategory,
  WindSpeedUnit,
} from '../types';

/** Why the app is asking for the device location; one copy deck per state. */
export type LocationPromptVariant = 'undetermined' | 'denied' | 'unavailable';

/** A unit as shown ("km/h") and as a screen reader should say it ("Kilometres per hour"). */
export interface UnitText {
  label: string;
  name: string;
}

/**
 * Every piece of interface text. Values are plain strings, or small functions where a number or a
 * name sits inside a sentence, so each language controls its own word order and punctuation.
 * Failure copy lives in `ui/error-messages.ts` and condition names in the providers, because both
 * are keyed by provider types the domain must not import.
 */
export interface Messages {
  common: {
    tryAgain: string;
    close: string;
    back: string;
    search: string;
    settings: string;
    edit: string;
    done: string;
    currentLocation: string;
    unavailable: string;
    searchForAPlace: string;
    /** Shown as the condition when a provider sends no usable description. */
    unknownConditions: string;
  };
  time: { today: string; tomorrow: string; now: string };
  freshness: {
    justNow: string;
    minutesAgo(minutes: number): string;
    hoursAgo(hours: number): string;
    daysAgo(days: number): string;
  };
  /** Playful one-liners about the weather. Flavour only: real information is always nearby. */
  mood: {
    lines: Record<ConditionCategory, string>;
    frigid: string;
    scorching: string;
    clearNight: string;
    clearCool: string;
  };
  units: {
    temperature: Record<TemperatureUnit, UnitText>;
    windSpeed: Record<WindSpeedUnit, UnitText>;
    precipitation: Record<PrecipitationUnit, UnitText>;
    distance: { km: string; mi: string };
    pressure: string;
    /** A percentage from an already formatted number: "50%", or "50 %" in French. */
    percent(value: string): string;
  };
  spoken: { degrees(value: string): string };
  home: { loading: string; savedPlaces: string; weatherDetails: string };
  current: {
    feelsLike(temperature: string): string;
    highLow(high: string, low: string): string;
    spokenFeelsLike(value: string): string;
    spokenHighLow(high: string, low: string): string;
  };
  forecast: {
    hourlyTitle: string;
    dailyTitle: string;
    high(value: string): string;
    low(value: string): string;
    precipChance(percent: number): string;
  };
  details: {
    titles: {
      wind: string;
      uvIndex: string;
      humidity: string;
      visibility: string;
      pressure: string;
      sun: string;
    };
    /** The 16 compass points clockwise from north: letters, name, and "from <name>" in a sentence. */
    compass: readonly (readonly [abbreviation: string, name: string, from: string])[];
    windSpoken(speed: string, from: string | null, gust: string | null): string;
    gusts(value: string): string;
    uv: Record<UvCategory, { label: string; advice: string }>;
    uvSpoken(value: string, category: string, advice: string): string;
    uvUnavailable: string;
    sunSpoken(sunrise: string, sunset: string): string;
    sunUnavailable: string;
  };
  alerts: {
    severity: Record<AlertSeverity, string>;
    more(count: number): string;
    issuedBy(sender: string): string;
    opensFull: string;
  };
  places: {
    permission: Record<LocationPromptVariant, { title: string; body: string }>;
    useMyLocation: string;
    openSettings: string;
    title: string;
    emptyTitle: string;
    emptyBody: string;
    moveUp(name: string): string;
    moveDown(name: string): string;
    remove(name: string): string;
    removeFromSaved(label: string): string;
    save(label: string): string;
  };
  search: {
    prompt: string;
    noResults: string;
    noResultsHint: string;
    searching: string;
    placeholder: string;
    clear: string;
  };
  settings: {
    sections: { temperature: string; windSpeed: string; precipitation: string; appearance: string };
    appearance: Record<Appearance, string>;
    note: string;
    attribution: { 'open-meteo': string; openweather: string };
  };
}
