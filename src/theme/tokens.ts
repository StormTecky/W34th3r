/**
 * Design tokens: the only place colours, type, spacing, radii, elevation and motion values are
 * defined (constitution Principle IV). Condition-specific art lives in theme-engine.ts.
 */

export interface ThemeColors {
  background: string;
  /** Cards and sheets. */
  surface: string;
  /** Surfaces sitting on a surface. */
  surfaceRaised: string;
  text: string;
  textSecondary: string;
  /** Accent used as text or icon colour. */
  accent: string;
  /** Accent used as a fill behind `onAccent`. */
  accentFill: string;
  onAccent: string;
  danger: string;
  /** Decorative dividers. */
  border: string;
  /** Borders that identify a control; at least 3:1 against the background. */
  controlBorder: string;
}

export type ColorScheme = 'light' | 'dark';

export const colors: Record<ColorScheme, ThemeColors> = {
  light: {
    background: '#F2F5FA',
    surface: '#FFFFFF',
    surfaceRaised: '#F8FAFD',
    text: '#0D1B2E',
    textSecondary: '#4B5B71',
    accent: '#1259C7',
    accentFill: '#1259C7',
    onAccent: '#FFFFFF',
    danger: '#B3261E',
    border: '#D5DDE8',
    controlBorder: '#6B7C93',
  },
  dark: {
    background: '#0A101C',
    surface: '#131B2B',
    surfaceRaised: '#1B2539',
    text: '#F1F5FB',
    textSecondary: '#A6B3C7',
    accent: '#7DB2FF',
    accentFill: '#7DB2FF',
    onAccent: '#0A101C',
    danger: '#FF8F86',
    border: '#2A3650',
    controlBorder: '#7C8BA3',
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 28,
  xl: 36,
  pill: 999,
} as const;

export interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

export const typography = {
  /** The place name above the hero temperature. */
  hero: { fontFamily: 'Outfit-ExtraBold', fontSize: 36, lineHeight: 42, letterSpacing: -0.5 },
  /** The hero temperature. */
  display: { fontFamily: 'Outfit-ExtraBold', fontSize: 128, lineHeight: 128, letterSpacing: -6 },
  numeral: { fontFamily: 'Outfit-Bold', fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 28, lineHeight: 34 },
  headline: { fontFamily: 'Outfit-Bold', fontSize: 20, lineHeight: 26 },
  body: { fontFamily: 'Outfit-Regular', fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: 'Outfit-Bold', fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: 'Outfit-Regular', fontSize: 13, lineHeight: 18 },
  label: { fontFamily: 'Outfit-ExtraBold', fontSize: 12, lineHeight: 16, letterSpacing: 1 },
} as const satisfies Record<string, TextStyleToken>;

export const elevation = {
  none: {},
  low: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  high: {
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

/** Durations in milliseconds, spring physics and the sizes of the small movements built on them. */
export const motion = {
  fast: 150,
  base: 280,
  slow: 700,
  /** Cross-fade when the weather theme changes. */
  theme: 900,
  /** All under-damped, so they overshoot a little and settle: a subtle bounce. */
  spring: {
    /** Quick and tight, for a control reacting to a finger. */
    press: { damping: 15, stiffness: 420, mass: 0.5 },
    /** Soft, for content arriving. */
    enter: { damping: 15, stiffness: 160, mass: 0.9 },
    /** Livelier, for a number that just changed. */
    pop: { damping: 9, stiffness: 320, mass: 0.5 },
  },
  /** Scale a control shrinks to while a finger is on it. */
  pressedScale: 0.95,
  /** The same for wide things such as list rows and banners, where 5% would be a lot of points. */
  pressedScaleWide: 0.98,
  /** Scale a number kicks up to when its value changes, before springing back to 1. */
  popScale: 1.06,
  /** Degrees a grabbed element turns per point dragged sideways. */
  grabTilt: 0.15,
  /** How far below its place content starts when it enters, in points. */
  enterRise: 24,
  /** Extra wait per item when several enter together, in milliseconds. */
  enterStagger: 70,
} as const;

/** Opacity of controls that are being pressed or are unavailable. */
export const opacity = {
  pressed: 0.7,
  disabled: 0.35,
} as const;

export const touch = {
  /** Minimum interactive target, in points. */
  minTarget: 44,
} as const;

/** Alert banner colours. Severity is also written in words, so colour is never the only signal. */
export const alertColors = {
  extreme: { background: '#FFD9D4', text: '#6B0A00' },
  severe: { background: '#FFE3D1', text: '#6E2A00' },
  moderate: { background: '#FFF0C7', text: '#5A4300' },
  minor: { background: '#DDEBFF', text: '#0F3466' },
  unknown: { background: '#E7EAF0', text: '#2B3445' },
} as const;

/** Soft shadow that keeps hero text legible on any sky. */
export const textShadow = {
  textShadowColor: 'rgba(0, 0, 0, 0.18)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
} as const;

/**
 * Temperature (degrees C) to colour, from cold blue through green and yellow to hot red. Range bars
 * use it so a glance shows how warm a day is, not only how wide its range is.
 */
export const temperatureScale: readonly (readonly [number, string])[] = [
  [-30, '#4C6FFF'],
  [-10, '#4FA8FF'],
  [5, '#4FD6D6'],
  [15, '#8EE06A'],
  [22, '#FFD84D'],
  [30, '#FF9A3D'],
  [38, '#FF5A4A'],
];
