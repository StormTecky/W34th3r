import { useFonts } from 'expo-font';

/** Bundled Outfit weights (SIL OFL, see assets/fonts/OFL.txt). */
const FONT_FILES = {
  'Outfit-Light': require('../../assets/fonts/Outfit-Light.ttf'),
  'Outfit-Regular': require('../../assets/fonts/Outfit-Regular.ttf'),
  'Outfit-Medium': require('../../assets/fonts/Outfit-Medium.ttf'),
  'Outfit-SemiBold': require('../../assets/fonts/Outfit-SemiBold.ttf'),
  'Outfit-Bold': require('../../assets/fonts/Outfit-Bold.ttf'),
  'Outfit-ExtraBold': require('../../assets/fonts/Outfit-ExtraBold.ttf'),
};

/**
 * True once fonts have loaded, or failed to load: in that case text falls back to the system font
 * rather than blocking the app.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_FILES);
  return loaded || error !== null;
}
