import { Sym, type SymbolId } from '../config/symbols';
import { GRID_COLS, GRID_ROWS } from '../config/gameConfig';
import type { ForcedOutcome } from '../engine/GameEngine';

const MAP: Record<string, SymbolId> = {
  T: Sym.TOKEN, K: Sym.TICKET, L: Sym.LANTERN, Y: Sym.KEY, W: Sym.WATCH,
  G: Sym.PIGEON, P: Sym.PASSENGER, R: Sym.RAT_KING, '*': Sym.WILD, S: Sym.SCATTER, H: Sym.SIGN, U: Sym.PUNCH,
};

/** 5 rows of 6 symbols, top to bottom -> column-major grid. */
export function grid(rows: string[]): SymbolId[] {
  const out: SymbolId[] = new Array(GRID_COLS * GRID_ROWS);
  rows.forEach((line, r) => [...line.replace(/\s/g, '')].forEach((ch, c) => (out[c * GRID_ROWS + r] = MAP[ch])));
  return out;
}

/** Development-only forced outcomes. The engine still resolves cascades with real RNG. */
export const SCENARIOS: Record<string, { label: string; outcome: ForcedOutcome }> = {
  cluster: {
    label: 'Cluster win',
    outcome: { base: grid(['R R R K L Y', 'R R K L Y W', 'L Y W G P T', 'Y W G P T K', 'W G P T K L']) },
  },
  cascade: {
    label: 'Cascade chain',
    outcome: { base: grid(['G G G K L Y', 'T T G G Y W', 'T T T G P K', 'T Y W L P K', 'T G P L K L']) },
  },
  platforms: {
    label: 'Phantom Platforms',
    outcome: { base: grid(['P P H K L Y', 'K P P H Y W', 'L Y H G P K', 'Y W G H T K', 'W G P T K L']) },
  },
  punch: {
    label: 'Ticket Punch',
    outcome: { base: grid(['R R U R K L', 'K L Y W R T', 'L U W G P R', 'Y W G P R T', 'W G U R T K']) },
  },
  train: {
    label: 'Midnight Train (3)',
    outcome: { base: grid(['S K L Y W G', 'K L Y S G P', 'L Y W G P R', 'Y W G P S T', 'W G P R T K']) },
  },
  train5: {
    label: 'Midnight Train (5)',
    outcome: { base: grid(['S K L Y W S', 'K L Y S G P', 'L S W G P R', 'Y W G P S T', 'W G P R T K']) },
  },
  bigwin: {
    label: 'Big win',
    outcome: { base: grid(['R R R R R R', 'R R * R R R', 'G G G G G G', 'P P P * P P', 'T T T T T T']) },
  },
};
