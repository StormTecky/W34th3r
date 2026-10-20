import { makeParticles, particleCount } from '@/theme/effects/particles';

describe('makeParticles', () => {
  it('is deterministic for the same seed and count', () => {
    expect(makeParticles(20, 7)).toEqual(makeParticles(20, 7));
  });

  it('differs between seeds', () => {
    expect(makeParticles(20, 1)).not.toEqual(makeParticles(20, 2));
  });

  it('returns the requested number of particles with every value in range', () => {
    const particles = makeParticles(50, 3);
    expect(particles).toHaveLength(50);
    for (const p of particles) {
      for (const value of [p.x, p.size, p.speed, p.delay, p.opacity]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('spreads particles across the width', () => {
    const xs = makeParticles(40, 5).map((p) => p.x);
    expect(Math.min(...xs)).toBeLessThan(0.25);
    expect(Math.max(...xs)).toBeGreaterThan(0.75);
  });

  it('returns nothing for a zero count', () => {
    expect(makeParticles(0, 1)).toEqual([]);
  });
});

describe('particleCount', () => {
  it('scales with intensity between a minimum and a maximum', () => {
    expect(particleCount(0, 10, 50)).toBe(0);
    expect(particleCount(1, 10, 50)).toBe(50);
    expect(particleCount(0.5, 10, 50)).toBe(30);
  });

  it('never exceeds the bounds, whatever the input', () => {
    expect(particleCount(7, 10, 50)).toBe(50);
    expect(particleCount(-1, 10, 50)).toBe(0);
  });

  it('keeps at least the minimum for any visible intensity', () => {
    expect(particleCount(0.01, 10, 50)).toBe(10);
  });
});
