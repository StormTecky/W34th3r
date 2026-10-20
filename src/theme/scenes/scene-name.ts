import type { ConditionCategory } from '@/domain/types';

export type SceneName =
  | 'sun'
  | 'moon'
  | 'sun-cloud'
  | 'moon-cloud'
  | 'clouds'
  | 'drizzle'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'sleet'
  | 'fog'
  | 'dust'
  | 'wind'
  | 'unknown';

const SCENES: Record<ConditionCategory, { day: SceneName; night: SceneName }> = {
  clear: { day: 'sun', night: 'moon' },
  'partly-cloudy': { day: 'sun-cloud', night: 'moon-cloud' },
  cloudy: { day: 'clouds', night: 'clouds' },
  drizzle: { day: 'drizzle', night: 'drizzle' },
  rain: { day: 'rain', night: 'rain' },
  thunderstorm: { day: 'storm', night: 'storm' },
  snow: { day: 'snow', night: 'snow' },
  sleet: { day: 'sleet', night: 'sleet' },
  'mist-fog': { day: 'fog', night: 'fog' },
  'dust-smoke': { day: 'dust', night: 'dust' },
  'squall-tornado': { day: 'wind', night: 'wind' },
  unknown: { day: 'unknown', night: 'unknown' },
};

/** Which illustration represents a condition at a time of day. */
export function sceneFor(condition: ConditionCategory, isDay: boolean): SceneName {
  const scenes = SCENES[condition] ?? SCENES.unknown;
  return isDay ? scenes.day : scenes.night;
}
