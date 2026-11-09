import { GRID_SIZE } from '../config/gameConfig';
import type { WeightTable } from '../config/featureConfig';
import type { SymbolId } from '../config/symbols';
import type { RNG } from './RNG';
import type { Cell, Grid } from './types';

/** Precomputed cumulative weight table for fast draws. */
export class WeightedPicker {
  readonly symbols: SymbolId[];
  private cumulative: number[];
  readonly total: number;

  constructor(table: WeightTable) {
    this.symbols = table.map((e) => e[0]);
    let acc = 0;
    this.cumulative = table.map((e) => {
      if (e[1] < 0) throw new Error('Negative weight');
      acc += e[1];
      return acc;
    });
    this.total = acc;
    if (acc <= 0) throw new Error('Weight table is empty');
  }

  pick(rng: RNG): SymbolId {
    const x = rng.next() * this.total;
    const cum = this.cumulative;
    for (let i = 0; i < cum.length; i++) if (x < cum[i]) return this.symbols[i];
    return this.symbols[this.symbols.length - 1];
  }

  probability(sym: SymbolId): number {
    let w = 0;
    let prev = 0;
    for (let i = 0; i < this.symbols.length; i++) {
      if (this.symbols[i] === sym) w += this.cumulative[i] - prev;
      prev = this.cumulative[i];
    }
    return w / this.total;
  }
}

/** Hands out unique symbol-instance ids within a round. */
export class IdSource {
  private n = 0;
  next(): number {
    return ++this.n;
  }
}

export function generateGrid(rng: RNG, picker: WeightedPicker, ids: IdSource): Grid {
  const g: Grid = new Array(GRID_SIZE);
  for (let i = 0; i < GRID_SIZE; i++) g[i] = { id: ids.next(), sym: picker.pick(rng) };
  return g;
}

export function gridFromSymbols(symbols: SymbolId[], ids: IdSource): Grid {
  if (symbols.length !== GRID_SIZE) throw new Error('Forced grid must have 30 symbols');
  return symbols.map((sym): Cell => ({ id: ids.next(), sym }));
}
