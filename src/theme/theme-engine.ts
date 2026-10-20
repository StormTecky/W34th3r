import type { ConditionCategory } from '@/domain/types';

/**
 * Maps `(condition, day/night)` to the weather look of the app: a saturated sky gradient, readable
 * text, solid "tile" colours for cards, and an ambient effect. Every text colour is chosen to meet
 * WCAG AA over every stop of its own gradient, and every tile text over its tile (verified in
 * tests/unit/theme).
 */

export type AmbientEffectKind = 'none' | 'clouds' | 'rain' | 'snow' | 'fog' | 'stars';

export interface AmbientEffect {
  kind: AmbientEffectKind;
  /** 0 (barely there) to 1 (full storm). */
  intensity: number;
}

/** Colours for the solid cards that sit on the sky. */
export interface TileColors {
  background: string;
  text: string;
  textSecondary: string;
  accent: string;
}

export interface WeatherTheme {
  /** `<condition>-<day|night>`, stable for diffing and tests. */
  key: string;
  gradient: readonly [string, string, string];
  text: string;
  textSecondary: string;
  /** Highlight colour on the sky (sun yellow on dark skies, violet on light ones). */
  accent: string;
  tile: TileColors;
  /** Colour for ambient particles (drops, flakes, stars, cloud wisps). */
  particle: string;
  /** Status bar content style: "light" means light icons for a dark background. */
  statusBar: 'light' | 'dark';
  effect: AmbientEffect;
}

type Ink = 'dark' | 'light';

interface Look {
  gradient: readonly [string, string, string];
  /** Whether text on the sky is dark (bright skies) or white (deep skies). */
  ink: Ink;
  /** Solid card colour and whether its text is dark or white. */
  tile: { background: string; ink: Ink; accent: string };
  accent?: string;
}

interface ConditionLooks {
  day: Look;
  night: Look;
  effect: AmbientEffect;
  /** Replaces `effect` after dark, e.g. stars on a clear night. */
  nightEffect?: AmbientEffect;
}

const SKY_INK = {
  dark: { text: '#24123F', textSecondary: '#3A1F63', accent: '#4B1FA8', statusBar: 'dark' },
  light: { text: '#FFFFFF', textSecondary: '#F1E9FF', accent: '#FFE066', statusBar: 'light' },
} as const;

const TILE_INK = {
  dark: { text: '#24123F', textSecondary: '#5A4278' },
  light: { text: '#FFFFFF', textSecondary: '#E6DCFF' },
} as const;

const look = (gradient: Look['gradient'], ink: Ink, tile: Look['tile'], accent?: string): Look => ({
  gradient,
  ink,
  tile,
  accent,
});

const LOOKS: Record<ConditionCategory, ConditionLooks> = {
  clear: {
    day: look(['#FFD84A', '#FFAE42', '#FF8A5B'], 'dark', {
      background: '#FFF4D6',
      ink: 'dark',
      accent: '#E8530E',
    }),
    night: look(['#1F1550', '#3A1F85', '#6B2FA8'], 'light', {
      background: '#2D1D78',
      ink: 'light',
      accent: '#FFE066',
    }),
    effect: { kind: 'none', intensity: 0 },
    nightEffect: { kind: 'stars', intensity: 0.8 },
  },
  'partly-cloudy': {
    day: look(['#7DD3FF', '#A8B9FF', '#FFC3A0'], 'dark', {
      background: '#FFFFFF',
      ink: 'dark',
      accent: '#3D5AFE',
    }),
    night: look(['#242A6B', '#4A3A92', '#7A4CA6'], 'light', {
      background: '#322B86',
      ink: 'light',
      accent: '#FFE066',
    }),
    effect: { kind: 'clouds', intensity: 0.4 },
  },
  cloudy: {
    day: look(['#A6B8F0', '#C6B4EA', '#F2C4DA'], 'dark', {
      background: '#FFFFFF',
      ink: 'dark',
      accent: '#6C3FE0',
    }),
    night: look(['#2B2C62', '#46427D', '#665A92'], 'light', {
      background: '#3B397A',
      ink: 'light',
      accent: '#FFE066',
    }),
    effect: { kind: 'clouds', intensity: 0.8 },
  },
  drizzle: {
    day: look(['#5E9BFF', '#7F8BFF', '#A97FF2'], 'dark', {
      background: '#FFFFFF',
      ink: 'dark',
      accent: '#3D5AFE',
    }),
    night: look(['#1C2160', '#2F2680', '#4A2A93'], 'light', {
      background: '#34308C',
      ink: 'light',
      accent: '#7FE0FF',
    }),
    effect: { kind: 'rain', intensity: 0.3 },
  },
  rain: {
    day: look(['#3445C7', '#5A3FC4', '#8A3FBF'], 'light', {
      background: '#FFFFFF',
      ink: 'dark',
      accent: '#3445C7',
    }),
    night: look(['#151A55', '#2A1C73', '#451E86'], 'light', {
      background: '#2E2A82',
      ink: 'light',
      accent: '#7FE0FF',
    }),
    effect: { kind: 'rain', intensity: 0.65 },
  },
  thunderstorm: {
    day: look(['#2A1A73', '#4F1F96', '#8A1FA8'], 'light', {
      background: '#FFE066',
      ink: 'dark',
      accent: '#7A1FA8',
    }),
    night: look(['#12082E', '#2A0F5E', '#4A1280'], 'light', {
      background: '#FFD84A',
      ink: 'dark',
      accent: '#7A1FA8',
    }),
    effect: { kind: 'rain', intensity: 1 },
  },
  snow: {
    day: look(['#A5E3FF', '#CFCBFF', '#FFD3F2'], 'dark', {
      background: '#FFFFFF',
      ink: 'dark',
      accent: '#4F5BFF',
    }),
    night: look(['#2A3B9C', '#4B54C0', '#6652C0'], 'light', {
      background: '#3B49B0',
      ink: 'light',
      accent: '#BFF3FF',
    }),
    effect: { kind: 'snow', intensity: 0.7 },
  },
  sleet: {
    day: look(['#9AB8E8', '#B9B2E6', '#E0BEE0'], 'dark', {
      background: '#FFFFFF',
      ink: 'dark',
      accent: '#4F5BFF',
    }),
    night: look(['#232A63', '#3C3877', '#5A4B8C'], 'light', {
      background: '#34317F',
      ink: 'light',
      accent: '#BFF3FF',
    }),
    effect: { kind: 'snow', intensity: 0.5 },
  },
  'mist-fog': {
    day: look(['#CFC9EE', '#E6CDEA', '#F8D9D2'], 'dark', {
      background: '#FFFFFF',
      ink: 'dark',
      accent: '#7A3FE0',
    }),
    night: look(['#34325E', '#4B4575', '#675C89'], 'light', {
      background: '#443F80',
      ink: 'light',
      accent: '#FFE066',
    }),
    effect: { kind: 'fog', intensity: 0.8 },
  },
  'dust-smoke': {
    day: look(['#FFC37A', '#FFA56E', '#F28A7A'], 'dark', {
      background: '#FFF4E8',
      ink: 'dark',
      accent: '#C2410C',
    }),
    night: look(['#3B2352', '#5A2E5E', '#7A3A5C'], 'light', {
      background: '#5B2E66',
      ink: 'light',
      accent: '#FFC37A',
    }),
    effect: { kind: 'fog', intensity: 0.6 },
  },
  'squall-tornado': {
    day: look(['#1F4A45', '#2A5F57', '#357467'], 'light', {
      background: '#E6FFF4',
      ink: 'dark',
      accent: '#14705C',
    }),
    night: look(['#0B1F25', '#14383B', '#1F4F4A'], 'light', {
      background: '#1F5A50',
      ink: 'light',
      accent: '#9CFFD8',
    }),
    effect: { kind: 'rain', intensity: 1 },
  },
  unknown: {
    day: look(['#B7BEF2', '#D2C3F0', '#F0CFE4'], 'dark', {
      background: '#FFFFFF',
      ink: 'dark',
      accent: '#6A2BE0',
    }),
    night: look(['#2A2B63', '#403C7A', '#5C4F90'], 'light', {
      background: '#38367F',
      ink: 'light',
      accent: '#FFE066',
    }),
    effect: { kind: 'none', intensity: 0 },
  },
};

const cache = new Map<string, WeatherTheme>();

function build(key: string, looks: ConditionLooks, isDay: boolean): WeatherTheme {
  const chosen = isDay ? looks.day : looks.night;
  const sky = SKY_INK[chosen.ink];
  const tileInk = TILE_INK[chosen.tile.ink];
  return {
    key,
    gradient: chosen.gradient,
    text: sky.text,
    textSecondary: sky.textSecondary,
    accent: chosen.accent ?? sky.accent,
    tile: { background: chosen.tile.background, accent: chosen.tile.accent, ...tileInk },
    particle: 'rgba(255,255,255,0.75)',
    statusBar: sky.statusBar,
    effect: (!isDay && looks.nightEffect) || looks.effect,
  };
}

/** Returns the theme for a condition and time of day. Unmapped conditions get the neutral theme. */
export function getTheme(condition: ConditionCategory, isDay: boolean): WeatherTheme {
  const resolved: ConditionCategory = condition in LOOKS ? condition : 'unknown';
  const key = `${resolved}-${isDay ? 'day' : 'night'}`;
  let theme = cache.get(key);
  if (!theme) {
    theme = build(key, LOOKS[resolved], isDay);
    cache.set(key, theme);
  }
  return theme;
}
