import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ScrubBar, SCRUB_INSET } from '@/features/forecast/ScrubBar';
import { centerFromIndex } from '@/features/forecast/scrub';
import { buildHourlyRows } from '@/features/forecast/forecast-view-model';
import { buildSnapshot } from '@/providers/fake/scenarios';
import { getTheme } from '@/theme/theme-engine';

import { renderWithProviders } from '../../../helpers/render';

const NOW = Math.floor(Date.parse('2026-10-20T12:20:00Z') / 1000);
const rows = buildHourlyRows(
  buildSnapshot('clear-day', { placeId: 'p', timeZone: 'Europe/Paris', now: NOW }),
  {
    units: 'c',
    now: NOW,
  },
);
const theme = getTheme('clear', true);

const bar = () => screen.getByTestId('scrub-bar');
const layout = async (width = 230) =>
  fireEvent(bar(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 48 } } });
const touch = (name: 'responderGrant' | 'responderMove', locationX: number) =>
  fireEvent(bar(), name, { nativeEvent: { locationX } });
const action = (actionName: 'increment' | 'decrement') =>
  fireEvent(bar(), 'accessibilityAction', { nativeEvent: { actionName } });

async function renderBar(index = 0, onChange = jest.fn()) {
  await renderWithProviders(
    <ScrubBar rows={rows} index={index} onChange={onChange} theme={theme} />,
  );
  await layout();
  return onChange;
}

describe('as an accessible slider', () => {
  it('is an adjustable control named "Time of day" that reads the chosen hour', async () => {
    await renderBar(0);
    expect(bar().props.accessibilityRole).toBe('adjustable');
    expect(bar().props.accessibilityLabel).toBe('Time of day');
    expect(bar().props.accessibilityValue).toEqual({ text: 'Now' });
    await renderBar(2);
    expect(screen.getAllByTestId('scrub-bar').at(-1)!.props.accessibilityValue.text).toBe(
      rows[2]!.dayTimeLabel,
    );
  });

  it('moves one hour with the increment and decrement actions', async () => {
    const onChange = await renderBar(5);
    await action('increment');
    expect(onChange).toHaveBeenLastCalledWith(6);
    await action('decrement');
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('does not move past either end', async () => {
    const onChange = await renderBar(0);
    await action('decrement');
    expect(onChange).toHaveBeenLastCalledWith(0);
    const last = await renderBar(rows.length - 1);
    await action('increment');
    expect(last).toHaveBeenLastCalledWith(rows.length - 1);
  });

  it('announces both actions to assistive technology', async () => {
    await renderBar(0);
    expect(bar().props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual([
      'increment',
      'decrement',
    ]);
  });

  it('is at least 44 points tall', async () => {
    await renderBar(0);
    expect(StyleSheet.flatten(bar().props.style).minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('dragging', () => {
  it('claims the touch and jumps to the hour under the finger', async () => {
    const onChange = await renderBar(0);
    expect(bar().props.onStartShouldSetResponder()).toBe(true);
    await touch('responderGrant', 100);
    expect(onChange).toHaveBeenLastCalledWith(10); // 100 / 230 * 23
  });

  it('follows the finger while it moves', async () => {
    const onChange = await renderBar(0);
    await touch('responderGrant', 0);
    await touch('responderMove', 110);
    expect(onChange).toHaveBeenLastCalledWith(11);
    await touch('responderMove', 230);
    expect(onChange).toHaveBeenLastCalledWith(rows.length - 1);
  });

  it('does not report the same hour twice in a row', async () => {
    const onChange = await renderBar(0);
    await touch('responderGrant', 100);
    await touch('responderMove', 101);
    await touch('responderMove', 102);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps the touch until the finger lifts, even over scrollable content', async () => {
    await renderBar(0);
    expect(bar().props.onResponderTerminationRequest()).toBe(false);
  });

  it('ignores touches before the bar has been measured', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<ScrubBar rows={rows} index={0} onChange={onChange} theme={theme} />);
    await touch('responderGrant', 100);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('snapping', () => {
  it('picks the hour whose tick was touched, for every hour', async () => {
    const onChange = await renderBar(0);
    for (let i = 1; i < rows.length; i++) {
      await touch('responderMove', centerFromIndex(i, rows.length, 230, SCRUB_INSET));
      expect(onChange).toHaveBeenLastCalledWith(i);
    }
  });

  it('sends a touch beside a tick to the nearest tick', async () => {
    const onChange = await renderBar(0);
    const gap =
      centerFromIndex(6, rows.length, 230, SCRUB_INSET) -
      centerFromIndex(5, rows.length, 230, SCRUB_INSET);
    const five = centerFromIndex(5, rows.length, 230, SCRUB_INSET);
    await touch('responderMove', five + gap * 0.3);
    expect(onChange).toHaveBeenLastCalledWith(5);
    await touch('responderMove', five + gap * 0.7);
    expect(onChange).toHaveBeenLastCalledWith(6);
  });

  it('centres the handle on the tick row', async () => {
    await renderBar(3);
    const thumb = StyleSheet.flatten(screen.getByTestId('scrub-thumb').props.style);
    // The bar is 52 points tall and its ticks are centred, so the handle's centre must be at 26.
    expect(thumb.top + thumb.height / 2).toBe(26);
  });
});

describe('a layout that does not move under the finger', () => {
  const capStyle = () => StyleSheet.flatten(screen.getByTestId('scrub-cap').props.style);

  it('reserves the same slot for the clock whether or not the way back to now is offered', async () => {
    await renderBar(0);
    const atRest = capStyle();
    expect(screen.queryByRole('button', { name: 'Back to now' })).toBeNull();
    expect(screen.getByTestId('icon-clock', { includeHiddenElements: true })).toBeTruthy();

    await renderBar(5);
    const travelling = StyleSheet.flatten(screen.getAllByTestId('scrub-cap').at(-1)!.props.style);
    expect(travelling.width).toBe(atRest.width);
    expect(travelling.height).toBe(atRest.height);
    expect(atRest.width).toBeGreaterThanOrEqual(44);
  });

  it('keeps the track outside the clock slot, so touching the clock never scrubs', async () => {
    const onChange = await renderBar(5);
    expect(screen.getByTestId('scrub-bar').props.onStartShouldSetResponder()).toBe(true);
    expect(screen.getByTestId('scrub-cap').props.onStartShouldSetResponder).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('what it shows', () => {
  it('draws one tick per hour', async () => {
    await renderBar(0);
    expect(screen.getAllByTestId('scrub-tick')).toHaveLength(rows.length);
  });

  it('labels the chosen hour above the handle', async () => {
    await renderBar(0);
    expect(screen.getByTestId('scrub-label').props.children).toBe('Now');
    await renderBar(3);
    expect(screen.getAllByTestId('scrub-label').at(-1)!.props.children).toBe(rows[3]!.timeLabel);
  });

  it('offers a way back to now only after scrubbing away from it', async () => {
    const onChange = await renderBar(0);
    expect(screen.queryByRole('button', { name: 'Back to now' })).toBeNull();
    await renderBar(4, onChange);
    const back = screen.getByRole('button', { name: 'Back to now' });
    await fireEvent.press(back);
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('renders nothing when there are no hours to scrub', async () => {
    await renderWithProviders(<ScrubBar rows={[]} index={0} onChange={jest.fn()} theme={theme} />);
    expect(screen.queryByTestId('scrub-bar')).toBeNull();
  });
});
