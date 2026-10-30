import { Dimensions } from 'react-native';

export interface ScreenSize {
  width: number;
  height: number;
}

/** The phone the tests describe unless they say otherwise; matches the safe-area frame. */
export const PHONE: ScreenSize = { width: 390, height: 844 };
export const PHONE_LANDSCAPE: ScreenSize = { width: 844, height: 390 };
export const TABLET: ScreenSize = { width: 820, height: 1180 };

/** Resizes the window that `useWindowDimensions` reports, as rotating a device would. */
export function setWindowSize(size: ScreenSize): void {
  Dimensions.set({
    window: { ...Dimensions.get('window'), ...size },
    screen: { ...Dimensions.get('screen'), ...size },
  });
}
