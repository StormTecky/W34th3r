import { render, screen } from '@testing-library/react-native';

import { motion } from '@/theme/tokens';
import { BounceText } from '@/ui/BounceText';

import { advance, flush, mockReducedMotion, SETTLE_MS, transformOf } from '../../helpers/motion';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const number = () => screen.getByTestId('number');

async function renderNumber(value: string) {
  const view = await render(<BounceText testID="number">{value}</BounceText>);
  await flush();
  return view;
}

async function peakScaleOver(milliseconds: number) {
  let peak = 0;
  for (let elapsed = 0; elapsed < milliseconds; elapsed += 16) {
    await advance(16);
    peak = Math.max(peak, transformOf(number(), 'scale'));
  }
  return peak;
}

describe('with motion allowed', () => {
  beforeEach(() => mockReducedMotion(false));

  it('shows its text and does not bounce when it first appears', async () => {
    await renderNumber('21°');
    expect(screen.getByText('21°')).toBeTruthy();
    expect(await peakScaleOver(500)).toBe(1);
  });

  it('pops past its size when the value changes, then settles back to 1', async () => {
    const view = await renderNumber('21°');
    await view.rerender(<BounceText testID="number">22°</BounceText>);
    expect(screen.getByText('22°')).toBeTruthy();

    const peak = await peakScaleOver(SETTLE_MS);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(motion.popScale + 0.02);
    expect(transformOf(number(), 'scale')).toBeCloseTo(1, 2);
  });

  it('does nothing when it is re-rendered with the same value', async () => {
    const view = await renderNumber('21°');
    await view.rerender(<BounceText testID="number">21°</BounceText>);
    expect(await peakScaleOver(500)).toBe(1);
  });
});

describe('with reduced motion', () => {
  beforeEach(() => mockReducedMotion(true));

  it('changes value without any scaling', async () => {
    const view = await renderNumber('21°');
    await view.rerender(<BounceText testID="number">22°</BounceText>);
    expect(screen.getByText('22°')).toBeTruthy();
    expect(await peakScaleOver(500)).toBe(1);
  });
});
