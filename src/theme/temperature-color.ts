import { temperatureScale } from './tokens';

function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');

/** The colour for a temperature in degrees C, blended between the scale's stops. */
export function temperatureColor(celsius: number): string {
  const first = temperatureScale[0]!;
  const last = temperatureScale[temperatureScale.length - 1]!;
  if (celsius <= first[0]) return first[1];
  if (celsius >= last[0]) return last[1];

  const upperIndex = temperatureScale.findIndex(([stop]) => stop >= celsius);
  const [lowStop, lowColor] = temperatureScale[upperIndex - 1]!;
  const [highStop, highColor] = temperatureScale[upperIndex]!;
  const t = (celsius - lowStop) / (highStop - lowStop);
  const from = channels(lowColor);
  const to = channels(highColor);
  const mixed = from.map((channel, i) => channel + (to[i]! - channel) * t);
  return `#${mixed.map(toHex).join('')}`;
}
