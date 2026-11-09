import { GRID_COLS, GRID_ROWS } from '../config/gameConfig';
import { idx } from './Grid';
import type { IdSource, WeightedPicker } from './OutcomeGenerator';
import type { RNG } from './RNG';
import type { Grid } from './types';

export interface CascadeResult {
  grid: Grid;
  /** Positions whose cell instance changed (fell into place or newly spawned). */
  landed: number[];
}

/**
 * Removes `removed` positions, lets every remaining symbol in a column fall
 * straight down, and fills the gaps at the top with new symbols drawn from
 * `refill`. New symbols are drawn column by column, bottom-most gap first, so
 * the draw order is deterministic for a given RNG.
 */
export function cascade(grid: Grid, removed: number[], rng: RNG, refill: WeightedPicker, ids: IdSource): CascadeResult {
  const out: Grid = grid.slice();
  const removedSet = new Set(removed);
  const landed: number[] = [];
  for (let c = 0; c < GRID_COLS; c++) {
    const survivors = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const i = idx(c, r);
      if (!removedSet.has(i)) survivors.push(grid[i]);
    }
    const gaps = GRID_ROWS - survivors.length;
    if (gaps === 0) continue;
    // Survivors keep order and settle at the bottom.
    for (let k = 0; k < survivors.length; k++) {
      const r = gaps + k;
      const i = idx(c, r);
      if (out[i] !== survivors[k] || grid[i].id !== survivors[k].id) {
        out[i] = survivors[k];
        if (grid[i].id !== survivors[k].id) landed.push(i);
      }
    }
    for (let r = gaps - 1; r >= 0; r--) {
      const i = idx(c, r);
      out[i] = { id: ids.next(), sym: refill.pick(rng) };
      landed.push(i);
    }
  }
  landed.sort((a, b) => a - b);
  return { grid: out, landed };
}
