import { featureConfig, freeSpinsFor } from '../config/featureConfig';
import type { SymbolId } from '../config/symbols';
import { resolveRound } from '../engine/RoundResolver';
import type { RNG } from '../engine/RNG';
import type { BonusResult, FreeSpinRound } from '../engine/types';

/**
 * Midnight Train free spins.
 *
 *  - Triggered by 3+ scatters on the initial base grid (see freeSpinsFor).
 *  - Free spins use the same bet and the free-spin weight tables.
 *  - Haunted tiles persist between free spins, up to freeSpinsCap.
 *  - 3+ scatters in a free spin add retriggerSpins more spins.
 *  - Total spins are guarded by maxTotalSpins; the bonus stops early if the
 *    max-win cap is reached.
 *  - The whole bonus is resolved up front; the UI only presents it.
 */
export function playMidnightTrain(
  rng: RNG,
  bet: number,
  scatterCount: number,
  winCapRemaining: number,
  options: { forcedGrids?: SymbolId[][]; validate?: boolean } = {},
): BonusResult {
  const mt = featureConfig.midnightTrain;
  const initialSpins = freeSpinsFor(scatterCount);
  let remaining = initialSpins;
  let played = 0;
  let win = 0;
  const haunted = new Set<number>();
  const rounds: FreeSpinRound[] = [];

  while (remaining > 0 && played < mt.maxTotalSpins) {
    remaining--;
    const r = resolveRound(rng, {
      mode: 'free',
      bet,
      haunted,
      winCapRemaining: winCapRemaining - win,
      forcedGrid: options.forcedGrids?.[played],
      validate: options.validate,
    });
    played++;
    win += r.win;
    let retriggered = 0;
    if (r.scatterCount >= mt.retriggerCount && played + remaining < mt.maxTotalSpins) {
      retriggered = Math.min(mt.retriggerSpins, mt.maxTotalSpins - played - remaining);
      remaining += retriggered;
    }
    rounds.push({ ...r, index: played, spinsRemaining: remaining, retriggered, bonusWinSoFar: win });
    if (r.hitMaxWin) break;
  }

  return { initialSpins, totalSpins: played, rounds, win };
}
