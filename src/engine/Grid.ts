import { GRID_COLS, GRID_ROWS, GRID_SIZE } from '../config/gameConfig';
import { ALL_SYMBOLS } from '../config/symbols';
import type { Grid } from './types';

export const idx = (col: number, row: number): number => col * GRID_ROWS + row;
export const colOf = (i: number): number => Math.floor(i / GRID_ROWS);
export const rowOf = (i: number): number => i % GRID_ROWS;

/** Orthogonal neighbours (no diagonals). Precomputed for speed. */
export const NEIGHBOURS: readonly number[][] = Array.from({ length: GRID_SIZE }, (_, i) => {
  const c = colOf(i);
  const r = rowOf(i);
  const n: number[] = [];
  if (r > 0) n.push(idx(c, r - 1));
  if (r < GRID_ROWS - 1) n.push(idx(c, r + 1));
  if (c > 0) n.push(idx(c - 1, r));
  if (c < GRID_COLS - 1) n.push(idx(c + 1, r));
  return n;
});

export const cloneGrid = (g: Grid): Grid => g.map((c) => ({ id: c.id, sym: c.sym }));

/** Throws if the grid has the wrong size or contains an undefined / unknown symbol. */
export function assertValidGrid(g: Grid): void {
  if (g.length !== GRID_SIZE) throw new Error(`Grid has ${g.length} cells, expected ${GRID_SIZE}`);
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (!c || !ALL_SYMBOLS.includes(c.sym)) throw new Error(`Invalid symbol at ${i}`);
  }
}

/** Pretty-printer used by tests and the dev panel. */
export function gridToString(g: Grid, names: (s: number) => string = (s) => String(s)): string {
  const lines: string[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: string[] = [];
    for (let c = 0; c < GRID_COLS; c++) row.push(names(g[idx(c, r)].sym).padEnd(3));
    lines.push(row.join(' '));
  }
  return lines.join('\n');
}
