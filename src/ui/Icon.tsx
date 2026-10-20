import Svg, { Circle, Path } from 'react-native-svg';

import { Decorative } from './Decorative';

export type IconName =
  | 'search'
  | 'list'
  | 'settings'
  | 'close'
  | 'chevron-left'
  | 'plus'
  | 'check'
  | 'arrow-up'
  | 'arrow-down'
  | 'trash'
  | 'pin'
  | 'bookmark'
  | 'info'
  | 'clock'
  | 'calendar'
  | 'wind'
  | 'sun'
  | 'droplet'
  | 'eye'
  | 'gauge';

// Line icons drawn on a 24x24 grid, in the style of Feather icons (MIT).
const PATHS: Record<IconName, string[]> = {
  search: ['M21 21l-4.35-4.35'],
  list: ['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
  settings: ['M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'],
  close: ['M18 6L6 18M6 6l12 12'],
  'chevron-left': ['M15 18l-6-6 6-6'],
  plus: ['M12 5v14M5 12h14'],
  check: ['M20 6L9 17l-5-5'],
  'arrow-up': ['M12 19V5M5 12l7-7 7 7'],
  'arrow-down': ['M12 5v14M19 12l-7 7-7-7'],
  trash: ['M3 6h18M19 6l-1 14H6L5 6M8 6V4h8v2M10 11v6M14 11v6'],
  pin: ['M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  info: ['M12 16v-4M12 8h.01'],
  clock: ['M12 6v6l4 2'],
  calendar: [
    'M8 2v4M16 2v4M3 10h18',
    'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  ],
  wind: [
    'M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2',
  ],
  sun: [
    'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  ],
  droplet: ['M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'],
  eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'],
  gauge: ['M12 12l4-4'],
};

/** Circles that complete some of the icons above. */
const CIRCLES: Partial<Record<IconName, { cx: number; cy: number; r: number }>> = {
  search: { cx: 11, cy: 11, r: 8 },
  pin: { cx: 12, cy: 10, r: 3 },
  info: { cx: 12, cy: 12, r: 10 },
  clock: { cx: 12, cy: 12, r: 10 },
  sun: { cx: 12, cy: 12, r: 5 },
  eye: { cx: 12, cy: 12, r: 3 },
  gauge: { cx: 12, cy: 12, r: 10 },
};

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  /** Fill instead of outline, e.g. for a saved bookmark. */
  filled?: boolean;
}

/** Decorative glyph: controls that use it carry their own accessibility label. */
export function Icon({ name, size = 24, color, filled = false }: IconProps) {
  const circle = CIRCLES[name];
  return (
    <Decorative testID={`icon-${name}`}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[name].map((d) => (
          <Path key={d} d={d} />
        ))}
        {circle ? <Circle cx={circle.cx} cy={circle.cy} r={circle.r} /> : null}
      </Svg>
    </Decorative>
  );
}
