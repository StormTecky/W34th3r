import { StyleSheet, View } from 'react-native';

import type { ConditionCategory } from '@/domain/types';

import {
  BoltArt,
  CloudArt,
  DropsArt,
  FlakesArt,
  FogArt,
  MoonArt,
  SunDisc,
  SunRays,
  WindArt,
} from './art';
import { Motion, type MotionSpec } from './Motion';
import { sceneFor, type SceneName } from './scene-name';

type Piece =
  | { type: 'rays' | 'disc' | 'moon' | 'bolt' | 'drops' | 'flakes' | 'wind' }
  | { type: 'cloud'; tone: string; shade: string }
  | { type: 'fog'; tone: string };

interface Layer {
  piece: Piece;
  x: number;
  y: number;
  size: number;
  motion?: MotionSpec;
}

/** The artwork is laid out in a 300 x 230 box and scaled to fit. */
const BOX = { width: 300, height: 230 } as const;

const WHITE = { type: 'cloud', tone: '#FFFFFF', shade: '#DCD6FF' } as const;
const MIST = { type: 'cloud', tone: '#EFEAFF', shade: '#CFC6FA' } as const;
const NIGHT = { type: 'cloud', tone: '#B9AFF0', shade: '#8E83D6' } as const;
const STORM = { type: 'cloud', tone: '#7C6AE0', shade: '#5B48C2' } as const;

const SPIN: MotionSpec = { kind: 'spin', duration: 48_000 };
const BOB: MotionSpec = { kind: 'float', duration: 4200 };
const DRIFT: MotionSpec = { kind: 'drift', duration: 7000 };

const SCENES: Record<SceneName, Layer[]> = {
  sun: [
    { piece: { type: 'rays' }, x: 50, y: 15, size: 200, motion: SPIN },
    { piece: { type: 'disc' }, x: 50, y: 15, size: 200, motion: BOB },
  ],
  moon: [{ piece: { type: 'moon' }, x: 60, y: 10, size: 190, motion: BOB }],
  'sun-cloud': [
    { piece: { type: 'rays' }, x: 10, y: 0, size: 170, motion: SPIN },
    { piece: { type: 'disc' }, x: 10, y: 0, size: 170 },
    { piece: WHITE, x: 70, y: 70, size: 220, motion: DRIFT },
  ],
  'moon-cloud': [
    { piece: { type: 'moon' }, x: 20, y: 0, size: 160, motion: BOB },
    { piece: NIGHT, x: 70, y: 70, size: 220, motion: DRIFT },
  ],
  clouds: [
    { piece: MIST, x: 10, y: 30, size: 170, motion: { kind: 'drift', duration: 9000, delay: 600 } },
    { piece: WHITE, x: 90, y: 70, size: 210, motion: DRIFT },
  ],
  drizzle: [
    { piece: WHITE, x: 45, y: 20, size: 210, motion: BOB },
    {
      piece: { type: 'drops' },
      x: 95,
      y: 130,
      size: 110,
      motion: { kind: 'fall', duration: 1600 },
    },
  ],
  rain: [
    { piece: MIST, x: 35, y: 10, size: 230, motion: BOB },
    {
      piece: { type: 'drops' },
      x: 70,
      y: 128,
      size: 130,
      motion: { kind: 'fall', duration: 1200 },
    },
    {
      piece: { type: 'drops' },
      x: 150,
      y: 140,
      size: 100,
      motion: { kind: 'fall', duration: 1200, delay: 500 },
    },
  ],
  storm: [
    { piece: STORM, x: 35, y: 5, size: 230, motion: BOB },
    {
      piece: { type: 'bolt' },
      x: 125,
      y: 100,
      size: 120,
      motion: { kind: 'pulse', duration: 900 },
    },
  ],
  snow: [
    { piece: WHITE, x: 45, y: 15, size: 210, motion: BOB },
    {
      piece: { type: 'flakes' },
      x: 80,
      y: 120,
      size: 140,
      motion: { kind: 'fall', duration: 2400 },
    },
  ],
  sleet: [
    { piece: MIST, x: 40, y: 15, size: 220, motion: BOB },
    {
      piece: { type: 'drops' },
      x: 60,
      y: 125,
      size: 100,
      motion: { kind: 'fall', duration: 1400 },
    },
    {
      piece: { type: 'flakes' },
      x: 140,
      y: 125,
      size: 100,
      motion: { kind: 'fall', duration: 2400 },
    },
  ],
  fog: [
    { piece: MIST, x: 60, y: 10, size: 190, motion: BOB },
    { piece: { type: 'fog', tone: '#FFFFFF' }, x: 50, y: 100, size: 200, motion: DRIFT },
  ],
  dust: [
    { piece: { type: 'disc' }, x: 70, y: 0, size: 170, motion: BOB },
    { piece: { type: 'fog', tone: '#FFE3B8' }, x: 50, y: 90, size: 200, motion: DRIFT },
  ],
  wind: [
    { piece: WHITE, x: 45, y: 20, size: 210, motion: BOB },
    { piece: { type: 'wind' }, x: 70, y: 125, size: 180, motion: DRIFT },
  ],
  unknown: [{ piece: WHITE, x: 45, y: 40, size: 210, motion: BOB }],
};

function Art({ piece, size }: { piece: Piece; size: number }) {
  switch (piece.type) {
    case 'rays':
      return <SunRays size={size} />;
    case 'disc':
      return <SunDisc size={size} />;
    case 'moon':
      return <MoonArt size={size} />;
    case 'cloud':
      return <CloudArt size={size} tone={piece.tone} shade={piece.shade} />;
    case 'bolt':
      return <BoltArt size={size} />;
    case 'drops':
      return <DropsArt size={size} />;
    case 'flakes':
      return <FlakesArt size={size} />;
    case 'fog':
      return <FogArt size={size} tone={piece.tone} />;
    default:
      return <WindArt size={size} />;
  }
}

export interface WeatherSceneProps {
  condition: ConditionCategory;
  isDay: boolean;
  /** Width in points; the height keeps the artwork's proportions. */
  size?: number;
}

/**
 * A big, friendly illustration of the weather: a sun with spinning rays, a moon among stars, fluffy
 * drifting clouds, falling rain or snow, a flashing bolt. Purely decorative.
 */
export function WeatherScene({ condition, isDay, size = BOX.width }: WeatherSceneProps) {
  const name = sceneFor(condition, isDay);
  const scale = size / BOX.width;

  return (
    <View
      testID={`weather-scene-${name}`}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: BOX.height * scale }}
    >
      {SCENES[name].map((layer, index) => (
        <Motion
          key={`${layer.piece.type}-${index}`}
          motion={layer.motion}
          style={[styles.layer, { left: layer.x * scale, top: layer.y * scale }]}
        >
          <Art piece={layer.piece} size={layer.size * scale} />
        </Motion>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ layer: { position: 'absolute' } });
