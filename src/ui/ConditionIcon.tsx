import type { ReactNode } from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Decorative } from './Decorative';

import type { ConditionCategory } from '@/domain/types';

export type IconName =
  | 'sun'
  | 'moon'
  | 'sun-cloud'
  | 'moon-cloud'
  | 'cloud'
  | 'drizzle'
  | 'rain'
  | 'thunderstorm'
  | 'snow'
  | 'sleet'
  | 'fog'
  | 'dust'
  | 'wind'
  | 'unknown';

const ICON_BY_CONDITION: Record<ConditionCategory, { day: IconName; night: IconName }> = {
  clear: { day: 'sun', night: 'moon' },
  'partly-cloudy': { day: 'sun-cloud', night: 'moon-cloud' },
  cloudy: { day: 'cloud', night: 'cloud' },
  drizzle: { day: 'drizzle', night: 'drizzle' },
  rain: { day: 'rain', night: 'rain' },
  thunderstorm: { day: 'thunderstorm', night: 'thunderstorm' },
  snow: { day: 'snow', night: 'snow' },
  sleet: { day: 'sleet', night: 'sleet' },
  'mist-fog': { day: 'fog', night: 'fog' },
  'dust-smoke': { day: 'dust', night: 'dust' },
  'squall-tornado': { day: 'wind', night: 'wind' },
  unknown: { day: 'unknown', night: 'unknown' },
};

/** Which drawing represents a condition at a time of day. */
export function iconNameFor(condition: ConditionCategory, isDay: boolean): IconName {
  const icons = ICON_BY_CONDITION[condition] ?? ICON_BY_CONDITION.unknown;
  return isDay ? icons.day : icons.night;
}

// Line icons drawn on a 24x24 grid, in the style of Feather icons (MIT).
const CLOUD = 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z';
const CLOUD_TOP = 'M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25';
const MOON = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';
const SMALL_MOON = 'M10.5 5.4A4.6 4.6 0 1 0 13 12.2 3.6 3.6 0 0 1 10.5 5.4z';
const SUN_RAYS: readonly (readonly [number, number, number, number])[] = [
  [12, 1, 12, 3],
  [12, 21, 12, 23],
  [4.22, 4.22, 5.64, 5.64],
  [18.36, 18.36, 19.78, 19.78],
  [1, 12, 3, 12],
  [21, 12, 23, 12],
  [4.22, 19.78, 5.64, 18.36],
  [18.36, 5.64, 19.78, 4.22],
];

const rays = SUN_RAYS.map(([x1, y1, x2, y2]) => (
  <Line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
));

const SMALL_CLOUD = <Path d={CLOUD} transform="translate(5.5 4.5) scale(0.72)" />;

const DRAWINGS: Record<IconName, ReactNode> = {
  sun: (
    <>
      <Circle cx={12} cy={12} r={5} />
      {rays}
    </>
  ),
  moon: <Path d={MOON} />,
  'sun-cloud': (
    <>
      <Circle cx={8} cy={8} r={3.2} />
      <Path d="M8 1.6v1M1.6 8h1M3.5 3.5l.7.7M12.5 3.5l-.7.7" />
      {SMALL_CLOUD}
    </>
  ),
  'moon-cloud': (
    <>
      <Path d={SMALL_MOON} />
      {SMALL_CLOUD}
    </>
  ),
  cloud: <Path d={CLOUD} />,
  drizzle: (
    <>
      <Path d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2M12 15v2" />
      <Path d={CLOUD_TOP} />
    </>
  ),
  rain: (
    <>
      <Path d="M16 13v8M8 13v8M12 15v8" />
      <Path d={CLOUD_TOP} />
    </>
  ),
  thunderstorm: (
    <>
      <Path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
      <Path d="M13 11l-4 6h6l-4 6" />
    </>
  ),
  snow: (
    <>
      <Path d="M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01" />
      <Path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
    </>
  ),
  sleet: (
    <>
      <Path d="M8 13v4M16 13v4M12 19h.01M12 23h.01" />
      <Path d={CLOUD_TOP} />
    </>
  ),
  fog: <Path d="M3 8h18M3 12h14M5 16h16M9 20h10" />,
  dust: (
    <Path d="M4 8h.01M9 8h.01M14 8h.01M19 8h.01M6 12h.01M11 12h.01M16 12h.01M4 16h.01M9 16h.01M14 16h.01M19 16h.01" />
  ),
  wind: (
    <Path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
  ),
  unknown: (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
    </>
  ),
};

export interface ConditionIconProps {
  condition: ConditionCategory;
  isDay: boolean;
  size?: number;
  color: string;
}

/**
 * Weather glyph. Decorative by default: callers put the condition in the text or accessibility
 * label next to it, so it is hidden from screen readers.
 */
export function ConditionIcon({ condition, isDay, size = 28, color }: ConditionIconProps) {
  const name = iconNameFor(condition, isDay);
  return (
    <Decorative testID={`condition-icon-${name}`}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {DRAWINGS[name]}
      </Svg>
    </Decorative>
  );
}
