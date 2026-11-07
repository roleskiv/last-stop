import { featureConfig } from '../config/featureConfig';
import { isRegular, Sym } from '../config/symbols';
import { NEIGHBOURS } from '../engine/Grid';
import type { IdSource, WeightedPicker } from '../engine/OutcomeGenerator';
import type { RNG } from '../engine/RNG';
import type { Grid, RoundEvent } from '../engine/types';

/**
 * Ticket Punch.
 *
 * Resolved once per round, on the freshly revealed grid, after Platform Signs
 * and before any win evaluation. Punches resolve in ascending position order.
 * Each punch:
 *  1. picks one regular-symbol position; weight = base + neighbourBonus x
 *     (orthogonal neighbours sharing that symbol), so punches favour spots
 *     that can grow clusters,
 *  2. turns the target into a Wild,
 *  3. turns itself into a regular symbol from the conversion table.
 * Cascade refills never contain punches, so a punch can never trigger another.
 */
export function resolvePunches(
  grid: Grid,
  rng: RNG,
  conversion: WeightedPicker,
  ids: IdSource,
  events: RoundEvent[],
  landed: Set<number>,
): number {
  const { baseTargetWeight, neighbourBonus } = featureConfig.ticketPunch;
  let count = 0;
  const punchPositions: number[] = [];
  for (let i = 0; i < grid.length; i++) if (grid[i].sym === Sym.PUNCH) punchPositions.push(i);

  for (const from of punchPositions) {
    const candidates: number[] = [];
    const weights: number[] = [];
    let total = 0;
    for (let i = 0; i < grid.length; i++) {
      const s = grid[i].sym;
      if (!isRegular(s)) continue;
      let same = 0;
      for (const n of NEIGHBOURS[i]) if (grid[n].sym === s || grid[n].sym === Sym.WILD) same++;
      const w = baseTargetWeight + neighbourBonus * same;
      candidates.push(i);
      weights.push(w);
      total += w;
    }
    const became = { id: ids.next(), sym: conversion.pick(rng) };
    if (candidates.length === 0) {
      // Nothing to punch: the punch just converts.
      grid[from] = became;
      landed.add(from);
      events.push({ t: 'punch', from, target: -1, targetBefore: Sym.PUNCH, became: { ...became } });
      continue;
    }
    let x = rng.next() * total;
    let target = candidates[candidates.length - 1];
    for (let k = 0; k < candidates.length; k++) {
      x -= weights[k];
      if (x < 0) {
        target = candidates[k];
        break;
      }
    }
    const targetBefore = grid[target].sym;
    grid[target] = { id: grid[target].id, sym: Sym.WILD };
    grid[from] = became;
    landed.add(from);
    events.push({ t: 'punch', from, target, targetBefore, became: { ...became } });
    count++;
  }
  return count;
}
