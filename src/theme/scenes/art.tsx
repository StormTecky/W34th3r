import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';

/**
 * Flat, friendly weather illustrations: a few bold shapes in two or three tones. Each piece draws
 * in its own square-ish viewBox and scales to `size`, so scenes can layer and animate them freely.
 */

export interface ArtProps {
  /** Rendered width in points; height follows the viewBox. */
  size: number;
}

const RAY_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

/** Twelve chunky rays around the sun; rotates slowly in the scene. */
export function SunRays({ size }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {RAY_ANGLES.map((angle) => (
        <G key={angle} transform={`rotate(${angle} 100 100)`}>
          <Line
            x1={100}
            y1={6}
            x2={100}
            y2={26}
            stroke="#FFF3A8"
            strokeWidth={11}
            strokeLinecap="round"
          />
        </G>
      ))}
    </Svg>
  );
}

/** The sun's face: a soft halo, a warm ring and a bright core. */
export function SunDisc({ size }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Circle cx={100} cy={100} r={66} fill="rgba(255,255,255,0.3)" />
      <Circle cx={100} cy={100} r={54} fill="#FFC93B" />
      <Circle cx={100} cy={100} r={46} fill="#FFE45C" />
      <Circle cx={84} cy={84} r={14} fill="#FFF6B8" opacity={0.8} />
    </Svg>
  );
}

const STARS: readonly (readonly [number, number, number])[] = [
  [30, 40, 7],
  [172, 28, 5],
  [160, 150, 6],
  [24, 130, 4],
];

/** A crescent moon with a few little stars. */
export function MoonArt({ size }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path d="M150 34a74 74 0 1 0 22 118A60 60 0 0 1 150 34z" fill="#FFF1B8" />
      <Path
        d="M150 34a74 74 0 1 0 22 118A60 60 0 0 1 150 34z"
        fill="#FFE27A"
        opacity={0.35}
        transform="translate(5 6)"
      />
      {STARS.map(([x, y, r]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#FFFFFF" />
      ))}
    </Svg>
  );
}

export interface CloudArtProps extends ArtProps {
  /** Main colour of the cloud. */
  tone: string;
  /** Underside colour, giving the cloud a little body. */
  shade: string;
}

/** A fluffy cloud built from circles on a rounded base. */
export function CloudArt({ size, tone, shade }: CloudArtProps) {
  const shapes = (fill: string, dy: number) => (
    <G transform={`translate(0 ${dy})`}>
      <Rect x={14} y={62} width={172} height={46} rx={23} fill={fill} />
      <Circle cx={66} cy={62} r={30} fill={fill} />
      <Circle cx={108} cy={44} r={38} fill={fill} />
      <Circle cx={146} cy={64} r={28} fill={fill} />
    </G>
  );
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 200 120">
      {shapes(shade, 8)}
      {shapes(tone, 0)}
    </Svg>
  );
}

/** A jagged lightning bolt. */
export function BoltArt({ size }: ArtProps) {
  return (
    <Svg width={size * 0.6} height={size} viewBox="0 0 60 100">
      <Polygon
        points="34,2 4,58 27,58 18,98 56,38 33,38"
        fill="#FFE45C"
        stroke="#FFF8C2"
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const DROPS: readonly (readonly [number, number])[] = [
  [24, 6],
  [56, 18],
  [88, 6],
];

/** Three slanted raindrops. */
export function DropsArt({ size }: ArtProps) {
  return (
    <Svg width={size} height={size * 0.5} viewBox="0 0 120 60">
      {DROPS.map(([x, y]) => (
        <Line
          key={x}
          x1={x + 6}
          y1={y}
          x2={x - 4}
          y2={y + 30}
          stroke="#7FE0FF"
          strokeWidth={9}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

const FLAKES: readonly (readonly [number, number, number])[] = [
  [20, 10, 8],
  [60, 34, 10],
  [100, 12, 8],
  [40, 52, 6],
  [86, 54, 7],
];

/** Round snowflakes. */
export function FlakesArt({ size }: ArtProps) {
  return (
    <Svg width={size} height={size * 0.55} viewBox="0 0 120 66">
      {FLAKES.map(([x, y, r]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#FFFFFF" />
      ))}
    </Svg>
  );
}

const BARS: readonly (readonly [number, number, number])[] = [
  [10, 10, 180],
  [30, 42, 150],
  [0, 74, 190],
  [40, 106, 130],
];

/** Layered fog banks. */
export function FogArt({ size, tone }: ArtProps & { tone: string }) {
  return (
    <Svg width={size} height={size * 0.65} viewBox="0 0 200 130">
      {BARS.map(([x, y, w]) => (
        <Rect key={y} x={x} y={y} width={w} height={20} rx={10} fill={tone} opacity={0.85} />
      ))}
    </Svg>
  );
}

/** Wind swirls. */
export function WindArt({ size }: ArtProps) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"
        stroke="#FFFFFF"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
