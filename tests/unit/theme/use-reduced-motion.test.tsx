import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReducedMotion } from '@/theme/use-reduced-motion';

afterEach(() => jest.restoreAllMocks());

describe('useReducedMotion', () => {
  it('reflects the OS setting once it has been read', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { result } = await renderHook(() => useReducedMotion());
    await act(async () => undefined);
    expect(result.current).toBe(true);
  });

  it('defaults to false when motion is not reduced', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result } = await renderHook(() => useReducedMotion());
    await act(async () => undefined);
    expect(result.current).toBe(false);
  });

  it('updates when the OS setting changes', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    let listener: (enabled: boolean) => void = () => undefined;
    const remove = jest.fn();
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, handler) => {
      listener = handler as (enabled: boolean) => void;
      return { remove } as never;
    });
    const { result, unmount } = await renderHook(() => useReducedMotion());
    await act(async () => undefined);
    await act(async () => listener(true));
    expect(result.current).toBe(true);
    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
