import { useWindowDimensions } from 'react-native';

import { layout, spacing } from './tokens';

export interface Layout {
  /** A tablet, or a phone on its side: room to put content side by side. */
  wide: boolean;
  /** Size of the Home illustration, so it fits its column with the temperature under it. */
  sceneSize: number;
}

/** How screens arrange themselves for a window size. */
export function layoutFor({ width, height }: { width: number; height: number }): Layout {
  const wide = width >= layout.wideFrom;
  const fitWidth = (column: number) => Math.min(layout.maxScene, column - spacing.xl * 2);
  if (!wide) return { wide, sceneSize: fitWidth(width) };
  // The hero shares the capped content width with the forecast, and a phone on its side is short.
  const column = (Math.min(width, layout.maxWidth) - spacing.lg * 2 - spacing.xl) / 2;
  return { wide, sceneSize: Math.min(fitWidth(column), height * layout.sceneHeightShare) };
}

/** Side padding that keeps content a margin away from notches and rounded corners. */
export function sidePadding(insets: { left: number; right: number }, margin: number) {
  return { paddingLeft: insets.left + margin, paddingRight: insets.right + margin };
}

/** The layout for the current window; updates when the device turns. */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return layoutFor({ width, height });
}
