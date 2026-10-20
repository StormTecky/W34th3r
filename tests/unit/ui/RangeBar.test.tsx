import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { RangeBar } from '@/ui/RangeBar';

const colors = { trackColor: '#d5dde8', fillColor: '#1259c7' };

function fillStyle() {
  return StyleSheet.flatten(
    screen.getByTestId('range-bar-fill', { includeHiddenElements: true }).props.style,
  );
}

describe('RangeBar', () => {
  it.each([
    ['a typical day', 0.2, 0.8],
    ['the coldest day of the week', 0, 0.4],
    ['the hottest day of the week', 0.6, 1],
    ['the full range', 0, 1],
    ['equal highs and lows', 0.5, 0.5],
  ])('renders %s', async (_label, start, end) => {
    await render(<RangeBar start={start} end={end} {...colors} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('positions the fill by percentage of the track', async () => {
    await render(<RangeBar start={0.25} end={0.75} {...colors} />);
    expect(fillStyle()).toMatchObject({ left: '25%', width: '50%' });
  });

  it('keeps a visible minimum width when start equals end', async () => {
    await render(<RangeBar start={0.5} end={0.5} {...colors} />);
    expect(parseFloat(String(fillStyle().width))).toBeGreaterThanOrEqual(8);
  });

  it('never lets the fill leave the track, even for out-of-range input', async () => {
    await render(<RangeBar start={-0.4} end={1.7} {...colors} />);
    const { left, width } = fillStyle();
    expect(parseFloat(String(left))).toBeGreaterThanOrEqual(0);
    expect(parseFloat(String(left)) + parseFloat(String(width))).toBeLessThanOrEqual(100);
  });

  it('shifts the fill left rather than overflowing when a minimum-width bar sits at the end', async () => {
    await render(<RangeBar start={1} end={1} {...colors} />);
    const { left, width } = fillStyle();
    expect(parseFloat(String(left)) + parseFloat(String(width))).toBeLessThanOrEqual(100);
  });

  it('is decorative: the numbers beside it carry the meaning', async () => {
    await render(<RangeBar start={0.2} end={0.8} {...colors} />);
    const track = screen.getByTestId('range-bar', { includeHiddenElements: true });
    expect(track.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
