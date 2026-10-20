/**
 * Deterministic particle layouts for ambient effects. Values are unit-range (0..1) and are scaled
 * by the effect that uses them. A seeded generator keeps the layout stable across re-renders and
 * makes snapshot and unit tests reliable.
 */

export interface Particle {
  /** Horizontal position as a fraction of the width. */
  x: number;
  /** Relative size. */
  size: number;
  /** Relative speed (higher is faster). */
  speed: number;
  /** Start offset as a fraction of one cycle, so particles are never in lockstep. */
  delay: number;
  opacity: number;
}

/** mulberry32: a tiny, well-distributed seeded PRNG. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeParticles(count: number, seed: number): Particle[] {
  const random = createRandom(seed);
  return Array.from({ length: Math.max(0, count) }, () => ({
    x: random(),
    size: random(),
    speed: random(),
    delay: random(),
    opacity: random(),
  }));
}

/** Number of particles for an intensity in 0..1: none at 0, otherwise between `min` and `max`. */
export function particleCount(intensity: number, min: number, max: number): number {
  const clamped = Math.min(1, Math.max(0, intensity));
  if (clamped === 0) return 0;
  return Math.round(min + (max - min) * clamped);
}
