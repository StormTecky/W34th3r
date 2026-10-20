import type { ConditionCategory } from './types';

/** Specific ids that differ from the category of their numeric range. */
const EXACT_CATEGORIES: Readonly<Record<number, ConditionCategory>> = {
  511: 'sleet',
  611: 'sleet',
  612: 'sleet',
  613: 'sleet',
  615: 'sleet',
  616: 'sleet',
  701: 'mist-fog',
  711: 'dust-smoke',
  721: 'mist-fog',
  731: 'dust-smoke',
  741: 'mist-fog',
  751: 'dust-smoke',
  761: 'dust-smoke',
  762: 'dust-smoke',
  771: 'squall-tornado',
  781: 'squall-tornado',
  800: 'clear',
  801: 'partly-cloudy',
  802: 'partly-cloudy',
  803: 'cloudy',
  804: 'cloudy',
};

/** Inclusive id ranges, used when an id has no exact entry. */
const RANGE_CATEGORIES: readonly (readonly [number, number, ConditionCategory])[] = [
  [200, 232, 'thunderstorm'],
  [300, 321, 'drizzle'],
  [500, 531, 'rain'],
  [600, 622, 'snow'],
];

/**
 * Maps an OpenWeather condition id to the app's closed set of categories.
 * https://openweathermap.org/weather-conditions
 */
export function categoryFromOpenWeatherId(id: number): ConditionCategory {
  const exact = EXACT_CATEGORIES[id];
  if (exact) return exact;
  const range = RANGE_CATEGORIES.find(([low, high]) => id >= low && id <= high);
  return range ? range[2] : 'unknown';
}

/**
 * Whether it is daytime at `observedAt`, given that day's sunrise and sunset (epoch seconds).
 *
 * Sunrise is inclusive and sunset exclusive. A sunset earlier than the sunrise means the daylight
 * period spans the provider's date boundary. When the provider reports no sun events (polar
 * regions: zero or identical values) we cannot tell, so we fall back to day.
 */
export function isDayAt(observedAt: number, sunrise: number, sunset: number): boolean {
  if (sunrise <= 0 || sunset <= 0 || sunrise === sunset) return true;
  if (sunrise < sunset) return observedAt >= sunrise && observedAt < sunset;
  return observedAt >= sunrise || observedAt < sunset;
}

const DAY_SECONDS = 86_400;

/**
 * Whether it is daytime at an arbitrary instant, reusing one reference day's sunrise and sunset.
 * The reference times are shifted by whole days so forecasts several days ahead still work. Day
 * length drifts by minutes over a week, which is negligible for choosing a day or night icon.
 */
export function isDayForInstant(instant: number, sunrise: number, sunset: number): boolean {
  if (sunrise <= 0 || sunset <= 0 || sunrise === sunset) return true;
  const shift = Math.floor((instant - sunrise) / DAY_SECONDS) * DAY_SECONDS;
  return isDayAt(instant, sunrise + shift, sunset + shift);
}
