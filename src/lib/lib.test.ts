import { describe, expect, it } from 'vitest';
import { TERMS, SYSTEMS } from '../data/terms';
import { generate, SIZES, decodeConfig, encodeConfig, type Config, type SizeKey, type Difficulty } from './generator';
import { readLine, snapEnd } from './geometry';

describe('terms', () => {
  it('are A–Z only, unique, with clues, and belong to a system', () => {
    const seen = new Set<string>();
    const ids = new Set(SYSTEMS.map((s) => s.id));
    for (const t of TERMS) {
      expect(t.word, t.word).toMatch(/^[A-Z]{3,15}$/);
      expect(t.clue.length).toBeGreaterThan(3);
      expect(ids.has(t.systemId)).toBe(true);
      expect(seen.has(t.word), `duplicate ${t.word}`).toBe(false);
      seen.add(t.word);
    }
    expect(TERMS.length).toBeGreaterThan(300);
  });
});

describe('generator', () => {
  const base: Config = { seed: 'abc', size: 'mini', diff: 'hard', systems: [], clue: false };

  it('is deterministic for a seed', () => {
    expect(generate(base).grid).toEqual(generate(base).grid);
  });

  it('places every word where the placement says, for all sizes and difficulties', () => {
    for (const size of Object.keys(SIZES) as SizeKey[])
      for (const diff of ['easy', 'medium', 'hard'] as Difficulty[]) {
        const p = generate({ ...base, size, diff });
        expect(p.placements.length).toBeGreaterThanOrEqual(Math.floor(SIZES[size].words * 0.9));
        for (const pl of p.placements) {
          const end = { r1: pl.r + pl.dr * (pl.word.length - 1), c1: pl.c + pl.dc * (pl.word.length - 1) };
          expect(readLine(p.grid, { r0: pl.r, c0: pl.c, ...end })).toBe(pl.word);
        }
      }
  });

  it('easy puzzles only run right/down', () => {
    const p = generate({ ...base, size: 'standard', diff: 'easy' });
    for (const pl of p.placements) expect(pl.dr >= 0 && pl.dc >= 0).toBe(true);
  });

  it('round-trips config through the URL hash', () => {
    const c: Config = { seed: 'x1', size: 'large', diff: 'medium', systems: ['nervous', 'senses'], clue: true };
    expect(decodeConfig('#' + encodeConfig(c))).toEqual(c);
    expect(decodeConfig('#garbage')).toBeNull();
  });
});

describe('snapEnd', () => {
  it('snaps to the 8 directions and stays in bounds', () => {
    expect(snapEnd({ r: 5, c: 5 }, { r: 5, c: 9 }, 20)).toEqual({ r: 5, c: 9 });
    expect(snapEnd({ r: 5, c: 5 }, { r: 9, c: 9 }, 20)).toEqual({ r: 9, c: 9 });
    expect(snapEnd({ r: 5, c: 5 }, { r: 9, c: 8 }, 20)).toEqual({ r: 9, c: 9 });
    expect(snapEnd({ r: 5, c: 5 }, { r: 1, c: 5 }, 20)).toEqual({ r: 1, c: 5 });
    expect(snapEnd({ r: 0, c: 0 }, { r: 3, c: -4 }, 20)).toEqual({ r: 0, c: 0 });
    expect(snapEnd({ r: 2, c: 2 }, { r: 2, c: 2 }, 20)).toEqual({ r: 2, c: 2 });
  });
});
