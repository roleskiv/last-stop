import { GRID_SIZE, gameConfig } from '../config/gameConfig';
import { clusterPay } from '../config/paytable';
import { REGULAR_SYMBOLS, Sym, type SymbolId } from '../config/symbols';
import { NEIGHBOURS } from './Grid';
import type { Cluster, Grid } from './types';

/**
 * Cluster evaluation.
 *
 * Rules:
 *  - For each regular symbol S, cells containing S or a Wild form a graph with
 *    orthogonal (never diagonal) edges.
 *  - Each connected component containing at least one real S and at least
 *    `minClusterSize` cells is a winning cluster of S.
 *  - A Wild may therefore belong to clusters of several symbols; each cluster
 *    pays independently.
 *  - Special symbols (Scatter, Sign, Punch) never join clusters.
 *  - Components of only Wilds never pay.
 *
 * Output order is deterministic: by symbol id, then by the lowest cell index
 * of the cluster; positions inside a cluster are sorted ascending.
 */
const stack = new Int16Array(GRID_SIZE);
const seen = new Uint8Array(GRID_SIZE);

export function findClusters(grid: Grid, bet: number, minSize: number = gameConfig.minClusterSize): Cluster[] {
  const out: Cluster[] = [];
  for (const sym of REGULAR_SYMBOLS) {
    seen.fill(0);
    for (let start = 0; start < GRID_SIZE; start++) {
      if (seen[start] || grid[start].sym !== sym) continue;
      // Flood fill from a real symbol (component always contains >= 1 real S).
      const positions: number[] = [];
      let sp = 0;
      stack[sp++] = start;
      seen[start] = 1;
      while (sp > 0) {
        const p = stack[--sp];
        positions.push(p);
        const nb = NEIGHBOURS[p];
        for (let k = 0; k < nb.length; k++) {
          const q = nb[k];
          if (seen[q]) continue;
          const s = grid[q].sym;
          if (s === sym || s === Sym.WILD) {
            seen[q] = 1;
            stack[sp++] = q;
          }
        }
      }
      if (positions.length >= minSize) {
        positions.sort((a, b) => a - b);
        out.push({
          sym: sym as SymbolId,
          positions,
          size: positions.length,
          payout: Math.round(clusterPay(sym, positions.length) * bet),
        });
      }
    }
  }
  return out;
}

/** Union of all winning positions, sorted. */
export function winningPositions(clusters: Cluster[]): number[] {
  const set = new Set<number>();
  for (const c of clusters) for (const p of c.positions) set.add(p);
  return [...set].sort((a, b) => a - b);
}
