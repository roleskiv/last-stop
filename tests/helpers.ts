import { Sym, type SymbolId } from '../src/config/symbols';
import { GRID_COLS, GRID_ROWS } from '../src/config/gameConfig';
import { idx } from '../src/engine/Grid';
import type { Grid } from '../src/engine/types';

const MAP: Record<string, SymbolId> = {
  T: Sym.TOKEN, K: Sym.TICKET, L: Sym.LANTERN, Y: Sym.KEY, W: Sym.WATCH,
  G: Sym.PIGEON, P: Sym.PASSENGER, R: Sym.RAT_KING, '*': Sym.WILD, S: Sym.SCATTER, H: Sym.SIGN, U: Sym.PUNCH,
};

/**
 * Build a symbol array from 5 row strings of 6 chars (rows top to bottom).
 * T token, K ticket, L lantern, Y key, W watch, G pigeon, P passenger, R rat king,
 * * wild, S scatter, H platform sign, U ticket punch.
 */
export function syms(rows: string[]): SymbolId[] {
  if (rows.length !== GRID_ROWS) throw new Error('need 5 rows');
  const out: SymbolId[] = new Array(GRID_COLS * GRID_ROWS);
  rows.forEach((line, r) => {
    const chars = line.replace(/\s/g, '');
    if (chars.length !== GRID_COLS) throw new Error(`row ${r} needs 6 symbols`);
    [...chars].forEach((ch, c) => {
      const s = MAP[ch];
      if (s === undefined) throw new Error(`bad symbol ${ch}`);
      out[idx(c, r)] = s;
    });
  });
  return out;
}

export function grid(rows: string[]): Grid {
  return syms(rows).map((sym, i) => ({ id: i + 1, sym }));
}

/** A checkerboard-ish grid with no clusters, no specials. */
export const DEAD = [
  'T K L Y W G',
  'K L Y W G P',
  'L Y W G P R',
  'Y W G P R T',
  'W G P R T K',
];
