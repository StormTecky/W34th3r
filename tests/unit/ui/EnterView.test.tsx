import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { motion } from '@/theme/tokens';
import { EnterView } from '@/ui/EnterView';

import {
  advance,
  animatedStyle,
  flush,
  mockReducedMotion,
  SETTLE_MS,
  transformOf,
} from '../../helpers/motion';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderEntering(order?: number) {
  await render(
    <EnterView testID="enter" order={order}>
      <Text>Hello</Text>
    </EnterView>,
  );
  await flush();
  return screen.getByTestId('enter');
}

describe('with motion allowed', () => {
  beforeEach(() => mockReducedMotion(false));

  it('starts transparent and lowered, then rises into place', async () => {
    const view = await renderEntering();
    expect(animatedStyle(view).opacity).toBe(0);
    expect(transformOf(view, 'translateY')).toBe(motion.enterRise);

    await advance(SETTLE_MS);
    expect(animatedStyle(view).opacity).toBe(1);
    expect(transformOf(view, 'translateY')).toBeCloseTo(0, 1);
  });

  it('overshoots its resting place a little before settling: the bounce', async () => {
    const view = await renderEntering();
    let highest: number = motion.enterRise;
    let opacityPeak = 0;
    for (let elapsed = 0; elapsed < SETTLE_MS; elapsed += 16) {
      await advance(16);
      highest = Math.min(highest, transformOf(view, 'translateY'));
      opacityPeak = Math.max(opacityPeak, animatedStyle(view).opacity ?? 0);
    }
    expect(highest).toBeLessThan(0);
    expect(opacityPeak).toBeLessThanOrEqual(1);
  });

  it('waits its turn: later items start later', async () => {
    const view = await renderEntering(3);
    await advance(motion.enterStagger * 3 - 20);
    expect(animatedStyle(view).opacity).toBe(0);
    await advance(SETTLE_MS);
    expect(animatedStyle(view).opacity).toBe(1);
  });

  it('keeps its content readable by assistive tech throughout', async () => {
    await renderEntering();
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});

describe('with reduced motion', () => {
  beforeEach(() => mockReducedMotion(true));

  it('is simply there: opaque and in place, with no animation', async () => {
    const view = await renderEntering(2);
    await advance(16); // one frame: the OS setting was read after the first render
    expect(animatedStyle(view).opacity).toBe(1);
    expect(transformOf(view, 'translateY')).toBe(0);
  });
});
