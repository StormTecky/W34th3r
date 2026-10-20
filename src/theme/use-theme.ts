import { useColorScheme } from 'react-native';

import { usePreferences } from '@/features/settings/use-preferences';

import { colors, type ColorScheme, type ThemeColors } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
}

/** Resolves light/dark from the user's appearance preference, falling back to the OS scheme. */
export function useTheme(): Theme {
  const { preferences } = usePreferences();
  const system = useColorScheme();
  const scheme: ColorScheme =
    preferences.appearance === 'system'
      ? system === 'dark'
        ? 'dark'
        : 'light'
      : preferences.appearance;
  return { scheme, colors: colors[scheme] };
}
