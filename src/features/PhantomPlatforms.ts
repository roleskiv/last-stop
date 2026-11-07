import { platformUpgrades, type WeightTable } from '../config/featureConfig';
import { isRegular, Sym, type SymbolId } from '../config/symbols';
import { WeightedPicker, type IdSource } from '../engine/OutcomeGenerator';
import type { RNG } from '../engine/RNG';
import type { Grid, RoundEvent } from '../engine/types';

const upgradePickers = new Map<number, WeightedPicker>(
  Object.entries(platformUpgrades).map(([k, t]) => [Number(k), new WeightedPicker(t as WeightTable)]),
);

/**
 * Phantom Platforms.
 *
 * 1. Each Haunted Platform Sign in a freshly revealed grid haunts its tile
 *    (if the haunted-tile cap allows), then turns into a regular symbol drawn
 *    from the conversion table. The new symbol counts as "landed" on that tile.
 * 2. Whenever a regular symbol newly lands on a haunted tile (from a sign,
 *    punch conversion, cascade drop, or a new free spin), it is upgraded by a
 *    draw from `platformUpgrades` before wins are evaluated.
 * 3. Each haunted tile activates at most once per cascade step.
 */
export function activateSigns(
  grid: Grid,
  haunted: Set<number>,
  cap: number,
  rng: RNG,
  conversion: WeightedPicker,
  ids: IdSource,
  events: RoundEvent[],
  landed: Set<number>,
): void {
  for (let pos = 0; pos < grid.length; pos++) {
    if (grid[pos].sym !== Sym.SIGN) continue;
    let nowHaunted = haunted.has(pos);
    if (!nowHaunted && haunted.size < cap) {
      haunted.add(pos);
      nowHaunted = true;
    }
    const became = { id: ids.next(), sym: conversion.pick(rng) };
    grid[pos] = became;
    landed.add(pos);
    events.push({ t: 'platform', pos, haunted: nowHaunted, became: { ...became } });
  }
}

export function applyUpgrades(
  grid: Grid,
  haunted: Set<number>,
  landed: Iterable<number>,
  rng: RNG,
  events: RoundEvent[],
): number {
  let count = 0;
  const positions = [...new Set(landed)].sort((a, b) => a - b);
  for (const pos of positions) {
    if (!haunted.has(pos)) continue;
    const from = grid[pos].sym;
    if (!isRegular(from)) continue;
    const picker = upgradePickers.get(from);
    if (!picker) continue;
    const to = picker.pick(rng) as SymbolId;
    if (to !== from) {
      grid[pos] = { id: grid[pos].id, sym: to };
      events.push({ t: 'upgrade', pos, from, to });
      count++;
    }
  }
  return count;
}
