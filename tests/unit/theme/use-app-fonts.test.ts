import { renderHook } from '@testing-library/react-native';
import { useFonts } from 'expo-font';

import { useAppFonts } from '@/theme/use-app-fonts';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
const mockedUseFonts = useFonts as jest.Mock;

describe('useAppFonts', () => {
  it('is false while fonts are still loading', async () => {
    mockedUseFonts.mockReturnValue([false, null]);
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current).toBe(false);
  });

  it('is true once the fonts have loaded', async () => {
    mockedUseFonts.mockReturnValue([true, null]);
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current).toBe(true);
  });

  it('is true when loading failed, so the app falls back to system fonts instead of blocking', async () => {
    mockedUseFonts.mockReturnValue([false, new Error('missing')]);
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current).toBe(true);
  });

  it('asks for the six bundled Outfit weights', async () => {
    mockedUseFonts.mockReturnValue([true, null]);
    await renderHook(() => useAppFonts());
    const requested = Object.keys(mockedUseFonts.mock.calls.at(-1)![0]);
    expect(requested).toEqual([
      'Outfit-Light',
      'Outfit-Regular',
      'Outfit-Medium',
      'Outfit-SemiBold',
      'Outfit-Bold',
      'Outfit-ExtraBold',
    ]);
  });
});
