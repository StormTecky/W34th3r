import { temperatureColor } from '@/theme/temperature-color';
import { temperatureScale } from '@/theme/tokens';

describe('temperatureColor', () => {
  it('returns the stop colour at each stop', () => {
    for (const [celsius, color] of temperatureScale) {
      expect(temperatureColor(celsius).toLowerCase()).toBe(color.toLowerCase());
    }
  });

  it('clamps below the coldest and above the hottest stop', () => {
    const [coldest, hottest] = [temperatureScale[0]!, temperatureScale.at(-1)!];
    expect(temperatureColor(-80).toLowerCase()).toBe(coldest[1].toLowerCase());
    expect(temperatureColor(60).toLowerCase()).toBe(hottest[1].toLowerCase());
  });

  it('blends between neighbouring stops', () => {
    const mid = temperatureColor(18.5); // halfway between 15 and 22
    expect(mid).toMatch(/^#[0-9a-f]{6}$/);
    expect(mid).not.toBe(temperatureColor(15));
    expect(mid).not.toBe(temperatureColor(22));
  });

  it('has strictly increasing stops, so the scale is well defined', () => {
    const stops = temperatureScale.map(([celsius]) => celsius);
    expect([...stops].sort((a, b) => a - b)).toEqual(stops);
    expect(new Set(stops).size).toBe(stops.length);
  });

  it('is warmer in hue as it gets hotter: red channel rises from green-yellow to red', () => {
    const red = (celsius: number) => parseInt(temperatureColor(celsius).slice(1, 3), 16);
    expect(red(15)).toBeLessThan(red(22));
    expect(red(30)).toBeGreaterThanOrEqual(red(22));
  });
});
