import type { MathConfig } from './config.ts';
import { CELLS, COLS, PAYING_COUNT, PUNCH, ROWS, SCATTER, SIGN, WILD } from './symbols.ts';
import type { RoundRecord, SpinRecord } from './types.ts';

/**
 * Independent audit of a round record.
 *
 * This does not use the engine. It re-derives every cluster, multiplier, pay and cascade
 * from the recorded boards with a deliberately simple implementation and compares the
 * result with what the record claims. A back office or a test lab can run it over stored
 * history; the test suite runs it over many thousands of rounds.
 *
 * Returns a list of problems. An empty list means the record is consistent with the rules.
 */
export function verifyRound(cfg: MathConfig, rec: RoundRecord): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => { if (errors.length < 20) errors.push(`${where}: ${msg}`); };
  const top = cfg.ladder.length - 1;
  const maxCoins = cfg.maxWinBets * cfg.coinsPerBet;
  /** Ladder index per cell, -1 for none. Carried from one free spin to the next. */
  let tile = new Array<number>(CELLS).fill(-1);
  let total = 0;
  let capped = false;

  const stepUp = (i: number) => { tile[i] = tile[i] < 0 ? 0 : Math.min(tile[i] + 1, top); };

  const checkSpin = (spin: SpinRecord, where: string, isFree: boolean): number[] => {
    if (!isFree) tile = new Array<number>(CELLS).fill(-1);
    const g = [...spin.grid];
    if (g.length !== CELLS) err(where, 'grid size');
    const initial = isFree ? cfg.weights.freeInitial : cfg.weights.baseInitial;
    const refill = isFree ? cfg.weights.freeRefill : cfg.weights.baseRefill;
    g.forEach((s, i) => { if (!(initial[s] > 0)) err(where, `symbol ${s} cannot land at ${i}`); });

    const expectTiles = tile.map((t, pos) => ({ pos, t })).filter((x) => x.t >= 0).map((x) => `${x.pos}:${cfg.ladder[x.t]}`).join(',');
    const gotTiles = [...spin.tilesStart].sort((a, b) => a.pos - b.pos).map((t) => `${t.pos}:${t.mult}`).join(',');
    if (expectTiles !== gotTiles) err(where, `platforms at start are [${gotTiles}], expected [${expectTiles}]`);

    let coins = 0;
    let pendingRemoval: number[] | null = null;
    let done = false;
    for (let k = 0; k < spin.steps.length; k++) {
      const step = spin.steps[k];
      const at = `${where} step ${k}`;
      if (done) err(at, 'step after the round was capped');
      if (pendingRemoval && step.t !== 'cascade') err(at, 'a win must be followed by a cascade');
      if (step.t === 'signs') {
        const all = g.map((s, i) => (s === SIGN ? i : -1)).filter((i) => i >= 0);
        if (all.join() !== step.signs.map((s) => s.pos).join()) err(at, 'sign positions');
        for (const s of step.signs) {
          stepUp(s.pos);
          if (s.mult !== cfg.ladder[tile[s.pos]]) err(at, `sign multiplier at ${s.pos}`);
          if (!(s.becomes < PAYING_COUNT) || !(cfg.weights.signFlip[s.becomes] > 0)) err(at, 'sign flips to an illegal symbol');
          g[s.pos] = s.becomes;
        }
      } else if (step.t === 'punch') {
        if (g.includes(SIGN)) err(at, 'punch before signs');
        const all = g.map((s, i) => (s === PUNCH ? i : -1)).filter((i) => i >= 0);
        if (all.join() !== step.punches.map((p) => p.pos).join()) err(at, 'punch positions');
        for (const p of step.punches) {
          g[p.pos] = WILD;
          const candidates = g.filter((s) => s < PAYING_COUNT).length;
          if (p.targets.length > 3 || (p.targets.length < 1 && candidates > 0)) err(at, 'punch target count');
          if (new Set(p.targets).size !== p.targets.length) err(at, 'duplicate punch target');
          for (const tpos of p.targets) {
            if (!(g[tpos] < PAYING_COUNT)) err(at, `punch target ${tpos} is not a regular symbol`);
            g[tpos] = WILD;
          }
        }
      } else if (step.t === 'win') {
        if (g.includes(SIGN) || g.includes(PUNCH)) err(at, 'win before features resolved');
        const found = findClusters(g);
        const key = (c: { sym: number; cells: number[] }) => `${c.sym}/${[...c.cells].sort((a, b) => a - b).join('.')}`;
        const want = found.map(key).sort().join('|');
        const got = step.clusters.map(key).sort().join('|');
        if (want !== got) err(at, 'clusters do not match the board');
        let stepCoins = 0;
        const removed = new Set<number>();
        for (const c of step.clusters) {
          let mult = 0;
          for (const p of c.cells) { if (tile[p] >= 0) mult += cfg.ladder[tile[p]]; removed.add(p); }
          if (mult === 0) mult = 1;
          const pay = cfg.pay[c.sym]?.[Math.min(c.cells.length, cfg.maxPaySize)] ?? -1;
          if (c.mult !== mult) err(at, `multiplier ${c.mult}, expected ${mult}`);
          if (c.coins !== pay * mult) err(at, `pay ${c.coins}, expected ${pay * mult}`);
          stepCoins += c.coins;
        }
        if (stepCoins !== step.coins) err(at, 'step total');
        const stepped: string[] = [];
        for (const p of [...removed].sort((a, b) => a - b)) {
          if (tile[p] >= 0) { tile[p] = Math.min(tile[p] + 1, top); stepped.push(`${p}:${cfg.ladder[tile[p]]}`); }
        }
        if (stepped.join() !== [...step.tiles].sort((a, b) => a.pos - b.pos).map((t) => `${t.pos}:${t.mult}`).join()) err(at, 'platform step-up');
        coins += stepCoins;
        total += stepCoins;
        if (total >= maxCoins) { coins -= total - maxCoins; total = maxCoins; capped = true; done = true; }
        else pendingRemoval = [...removed].sort((a, b) => a - b);
      } else {
        if (!pendingRemoval) { err(at, 'cascade without a win'); continue; }
        if (pendingRemoval.join() !== step.removed.join()) err(at, 'removed cells');
        const gone = new Set(pendingRemoval);
        for (let c = 0; c < COLS; c++) {
          const keep: number[] = [];
          for (let r = 0; r < ROWS; r++) if (!gone.has(c * ROWS + r)) keep.push(g[c * ROWS + r]);
          const fresh = ROWS - keep.length;
          for (let r = 0; r < ROWS; r++) {
            const now = step.grid[c * ROWS + r];
            if (r < fresh) { if (!(refill[now] > 0)) err(at, `symbol ${now} cannot refill`); }
            else if (now !== keep[r - fresh]) err(at, `column ${c} did not fall correctly`);
          }
        }
        for (let i = 0; i < CELLS; i++) g[i] = step.grid[i];
        pendingRemoval = null;
      }
    }
    if (!done) {
      if (pendingRemoval) err(where, 'missing final cascade');
      if (g.includes(SIGN) || g.includes(PUNCH)) err(where, 'unresolved feature symbols');
      if (findClusters(g).length > 0) err(where, 'unpaid cluster on the final board');
    }
    if (coins !== spin.coins) err(where, `spin total ${spin.coins}, expected ${coins}`);
    const scatters = g.map((s, i) => (s === SCATTER ? i : -1)).filter((i) => i >= 0);
    if (scatters.join() !== spin.scatters.join()) err(where, 'scatter positions');
    return scatters;
  };

  const baseScatters = checkSpin(rec.base, 'base', false);
  const baseCoins = total;
  let left = 0, granted = 0;
  if (baseScatters.length >= 3 && !capped) {
    left = granted = cfg.freeSpins[Math.min(baseScatters.length, cfg.freeSpins.length - 1)];
    baseScatters.forEach(stepUp);
  }
  if (rec.mode === 'buy' && baseScatters.length < 3) err('base', 'a bought bonus must start with 3+ Scatters');
  if (rec.base.awarded !== left) err('base', `awarded ${rec.base.awarded} free spins, expected ${left}`);

  let played = 0;
  for (const spin of rec.free) {
    const where = `free ${played + 1}`;
    if (left <= 0 || capped) { err(where, 'more free spins than were awarded'); break; }
    left--; played++;
    const sc = checkSpin(spin, where, true);
    let add = 0;
    if (sc.length >= 3 && !capped) {
      add = Math.min(cfg.retrigger[Math.min(sc.length, cfg.retrigger.length - 1)], cfg.maxFreeSpins - granted);
      left += add; granted += add;
      sc.forEach(stepUp);
    }
    if (spin.awarded !== add) err(where, `awarded ${spin.awarded}, expected ${add}`);
  }
  if (left > 0 && !capped) err('round', `${left} free spins were not played`);
  if (rec.coins !== total) err('round', `total ${rec.coins}, expected ${total}`);
  if (rec.capped !== capped) err('round', 'cap flag');
  if (rec.baseCoins !== Math.min(baseCoins, total) || rec.baseCoins + rec.bonusCoins !== rec.coins) err('round', 'base/bonus split');
  if (rec.coins > maxCoins) err('round', 'win above the maximum');
  if (rec.mathId !== cfg.id) err('round', 'math id');
  return errors;
}

/** Plain breadth-first cluster search. Wilds join any neighbouring cluster and can be shared. */
export function findClusters(g: number[]): { sym: number; cells: number[] }[] {
  const out: { sym: number; cells: number[] }[] = [];
  for (let sym = 0; sym < PAYING_COUNT; sym++) {
    const seen = new Set<number>();
    for (let start = 0; start < CELLS; start++) {
      if (g[start] !== sym || seen.has(start)) continue;
      const cells: number[] = [];
      const queue = [start];
      seen.add(start);
      while (queue.length) {
        const p = queue.shift()!;
        cells.push(p);
        const col = Math.floor(p / ROWS), row = p % ROWS;
        const near: number[] = [];
        if (row > 0) near.push(p - 1);
        if (row < ROWS - 1) near.push(p + 1);
        if (col > 0) near.push(p - ROWS);
        if (col < COLS - 1) near.push(p + ROWS);
        for (const q of near) {
          if (!seen.has(q) && (g[q] === sym || g[q] === WILD)) { seen.add(q); queue.push(q); }
        }
      }
      if (cells.length >= 5) out.push({ sym, cells: cells.sort((a, b) => a - b) });
    }
  }
  return out;
}
