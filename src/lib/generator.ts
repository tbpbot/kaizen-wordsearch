import { SYSTEMS, TERMS, type Term } from '../data/terms';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type SizeKey = 'mini' | 'standard' | 'large' | 'massive' | 'colossal';

export const SIZES: Record<SizeKey, { label: string; n: number; words: number; blurb: string }> = {
  mini: { label: 'Mini', n: 12, words: 10, blurb: '12×12 · 10 terms' },
  standard: { label: 'Standard', n: 18, words: 22, blurb: '18×18 · 22 terms' },
  large: { label: 'Large', n: 26, words: 45, blurb: '26×26 · 45 terms' },
  massive: { label: 'Massive', n: 36, words: 85, blurb: '36×36 · 85 terms' },
  colossal: { label: 'Colossal', n: 50, words: 160, blurb: '50×50 · 160 terms' },
};

export const DIFFICULTIES: Record<Difficulty, { label: string; blurb: string }> = {
  easy: { label: 'Easy', blurb: 'Across and down' },
  medium: { label: 'Medium', blurb: '+ diagonals' },
  hard: { label: 'Hard', blurb: '+ backwards' },
};

type Dir = [number, number];
const DIRS: Record<Difficulty, Dir[]> = {
  easy: [[0, 1], [1, 0]],
  medium: [[0, 1], [1, 0], [1, 1], [-1, 1]],
  hard: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]],
};

export interface Config {
  seed: string;
  size: SizeKey;
  diff: Difficulty;
  /** Empty array means every system. */
  systems: string[];
  /** Clue mode shows definitions instead of the words. */
  clue: boolean;
}

export interface Placement extends Term {
  r: number;
  c: number;
  dr: number;
  dc: number;
}

export interface Puzzle {
  config: Config;
  n: number;
  grid: string[][];
  placements: Placement[];
}

export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const conflicts = (t: Term, chosen: Term[]) =>
  chosen.some((o) => o.word.includes(t.word) || t.word.includes(o.word));

function pickTerms(config: Config, n: number, rng: () => number): Term[] {
  const ids = config.systems.length ? config.systems : SYSTEMS.map((s) => s.id);
  const buckets = ids.map((id) =>
    shuffle(TERMS.filter((t) => t.systemId === id && t.word.length <= n), rng),
  );
  const target = SIZES[config.size].words;
  const chosen: Term[] = [];
  let progressed = true;
  while (chosen.length < target && progressed) {
    progressed = false;
    for (const bucket of buckets) {
      while (bucket.length) {
        const t = bucket.pop()!;
        if (!conflicts(t, chosen)) {
          chosen.push(t);
          progressed = true;
          break;
        }
      }
      if (chosen.length >= target) break;
    }
  }
  return chosen;
}

function fits(grid: string[][], word: string, r: number, c: number, dr: number, dc: number, n: number) {
  const er = r + dr * (word.length - 1);
  const ec = c + dc * (word.length - 1);
  if (er < 0 || er >= n || ec < 0 || ec >= n) return false;
  for (let i = 0; i < word.length; i++) {
    const cur = grid[r + dr * i][c + dc * i];
    if (cur !== '' && cur !== word[i]) return false;
  }
  return true;
}

const FILLER = 'EEEEEEAAAAAIIIIOOOONNNRRRTTTLLSSUUDGBCMPFHVWYKJXQZ';

export function generate(config: Config): Puzzle {
  const n = SIZES[config.size].n;
  const rng = mulberry32(
    hashSeed([config.seed, config.size, config.diff, config.systems.join(',')].join('|')),
  );
  const terms = pickTerms(config, n, rng).sort((a, b) => b.word.length - a.word.length);
  const dirs = DIRS[config.diff];
  const grid: string[][] = Array.from({ length: n }, () => Array<string>(n).fill(''));
  const placements: Placement[] = [];

  for (const term of terms) {
    let spot: Placement | null = null;
    for (let attempt = 0; attempt < 250 && !spot; attempt++) {
      const [dr, dc] = dirs[Math.floor(rng() * dirs.length)];
      const r = Math.floor(rng() * n);
      const c = Math.floor(rng() * n);
      if (fits(grid, term.word, r, c, dr, dc, n)) spot = { ...term, r, c, dr, dc };
    }
    if (!spot) {
      // Crowded grid: exhaustively look for any legal slot.
      const all: Placement[] = [];
      for (const [dr, dc] of dirs)
        for (let r = 0; r < n; r++)
          for (let c = 0; c < n; c++)
            if (fits(grid, term.word, r, c, dr, dc, n)) all.push({ ...term, r, c, dr, dc });
      if (all.length) spot = all[Math.floor(rng() * all.length)];
    }
    if (!spot) continue;
    for (let i = 0; i < term.word.length; i++) grid[spot.r + spot.dr * i][spot.c + spot.dc * i] = term.word[i];
    placements.push(spot);
  }

  // Fill gaps with a mix of letters from the chosen words (to keep it tricky) and common letters.
  const pool = placements.map((p) => p.word).join('') || FILLER;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] === '') {
        const src = rng() < 0.5 ? pool : FILLER;
        grid[r][c] = src[Math.floor(rng() * src.length)];
      }

  return { config, n, grid, placements };
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

// ---- URL hash (shareable puzzles) ----

export function encodeConfig(c: Config): string {
  const p = new URLSearchParams({ seed: c.seed, size: c.size, diff: c.diff });
  if (c.systems.length) p.set('sys', c.systems.join(','));
  if (c.clue) p.set('clue', '1');
  return p.toString();
}

export function decodeConfig(hash: string): Config | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const seed = p.get('seed');
  const size = p.get('size') as SizeKey | null;
  const diff = p.get('diff') as Difficulty | null;
  if (!seed || !size || !diff || !(size in SIZES) || !(diff in DIFFICULTIES)) return null;
  const valid = new Set(SYSTEMS.map((s) => s.id));
  const systems = (p.get('sys') ?? '').split(',').filter((s) => valid.has(s));
  return { seed: seed.slice(0, 24), size, diff, systems, clue: p.get('clue') === '1' };
}
