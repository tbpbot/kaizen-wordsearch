export interface Cell {
  r: number;
  c: number;
}

export interface Line {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

/**
 * Snap a free pointer position to the nearest of the 8 straight directions
 * from `a`, clamped inside an n×n grid.
 */
export function snapEnd(a: Cell, b: Cell, n: number): Cell {
  const dr = b.r - a.r;
  const dc = b.c - a.c;
  if (dr === 0 && dc === 0) return a;
  const step = Math.round(Math.atan2(dr, dc) / (Math.PI / 4));
  const sdr = Math.round(Math.sin((step * Math.PI) / 4));
  const sdc = Math.round(Math.cos((step * Math.PI) / 4));
  const proj = (dr * sdr + dc * sdc) / (sdr * sdr + sdc * sdc);
  let len = Math.max(0, Math.round(proj));
  while (len > 0) {
    const r = a.r + sdr * len;
    const c = a.c + sdc * len;
    if (r >= 0 && r < n && c >= 0 && c < n) break;
    len--;
  }
  return { r: a.r + sdr * len, c: a.c + sdc * len };
}

/** Letters along a straight line (assumes the line is horizontal, vertical or 45°). */
export function readLine(grid: string[][], { r0, c0, r1, c1 }: Line): string {
  const len = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) + 1;
  const dr = Math.sign(r1 - r0);
  const dc = Math.sign(c1 - c0);
  let out = '';
  for (let i = 0; i < len; i++) out += grid[r0 + dr * i][c0 + dc * i];
  return out;
}

export function isStraight({ r0, c0, r1, c1 }: Line): boolean {
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  return dr === 0 || dc === 0 || dr === dc;
}
