import { describe, expect, it } from 'vitest';
import { findClusters, winningPositions } from '../src/engine/ClusterEvaluator';
import { clusterPay } from '../src/config/paytable';
import { Sym } from '../src/config/symbols';
import { idx } from '../src/engine/Grid';
import { DEAD, grid } from './helpers';

const BET = 1000; // 10 credits in centi-credits

describe('cluster detection', () => {
  it('finds nothing on a dead grid', () => {
    expect(findClusters(grid(DEAD), BET)).toEqual([]);
  });

  it('detects a horizontal 5-cluster and pays from the paytable', () => {
    const g = grid(['T T T T T G', 'K L Y W G P', 'L Y W G P R', 'Y W G P R T', 'W G P R T K']);
    const c = findClusters(g, BET);
    expect(c).toHaveLength(1);
    expect(c[0].sym).toBe(Sym.TOKEN);
    expect(c[0].size).toBe(5);
    expect(c[0].positions).toEqual([0, 5, 10, 15, 20].map((p) => p));
    expect(c[0].payout).toBe(Math.round(clusterPay(Sym.TOKEN, 5) * BET));
  });

  it('requires at least 5 symbols', () => {
    const g = grid(['T T T T K G', 'K L Y W G P', 'L Y W G P R', 'Y W G P R T', 'W G P R T K']);
    expect(findClusters(g, BET)).toEqual([]);
  });

  it('connects vertically and horizontally but never diagonally', () => {
    const diag = grid(['R K L Y W G', 'K R Y W G P', 'L Y R G P T', 'Y W G R T T', 'W G P K R K']);
    expect(findClusters(diag, BET)).toEqual([]);
    const lshape = grid(['R K L Y W G', 'R L Y W G P', 'R Y W G P T', 'R R G P T K', 'W G P K L K']);
    const c = findClusters(lshape, BET);
    expect(c).toHaveLength(1);
    expect(c[0].size).toBe(5);
    expect(c[0].sym).toBe(Sym.RAT_KING);
  });

  it('evaluates separate clusters of the same symbol independently', () => {
    const g = grid(['G G G G G K', 'K L Y W L P', 'L Y W Y P R', 'G G G G G T', 'W K P R T K']);
    const c = findClusters(g, BET);
    expect(c).toHaveLength(2);
    expect(c.every((x) => x.sym === Sym.PIGEON && x.size === 5)).toBe(true);
  });
});

describe('wild substitution', () => {
  it('wilds complete a cluster', () => {
    const g = grid(['P P * P P K', 'K L Y W G T', 'L Y W G T R', 'Y W G T R T', 'W G T R T K']);
    const c = findClusters(g, BET);
    expect(c).toHaveLength(1);
    expect(c[0].sym).toBe(Sym.PASSENGER);
    expect(c[0].positions).toContain(idx(2, 0));
  });

  it('a wild can join clusters of two different symbols (overlap)', () => {
    const g = grid([
      'T T * R R K',
      'K T Y R L G',
      'L T W R G P',
      'Y W G K P K',
      'W G P Y T L',
    ]);
    const c = findClusters(g, BET);
    const syms = c.map((x) => x.sym).sort();
    expect(syms).toEqual([Sym.TOKEN, Sym.RAT_KING].sort());
    for (const cl of c) expect(cl.positions).toContain(idx(2, 0));
    // The wild is removed once even though it paid twice.
    const removed = winningPositions(c);
    expect(removed.filter((p) => p === idx(2, 0))).toHaveLength(1);
    expect(removed).toHaveLength(c[0].size + c[1].size - 1);
  });

  it('pure-wild groups never pay', () => {
    const g = grid(['* * * * * K', 'K L Y W G P', 'L Y W G P R', 'Y W G P R T', 'W G P R T K']);
    const c = findClusters(g, BET);
    // Wilds touch K at (5,0)? no: K at col5 row0 has 1 neighbour wild -> K+5 wilds = 6 -> a ticket cluster.
    expect(c.every((x) => x.sym !== Sym.WILD)).toBe(true);
  });

  it('special symbols never join clusters', () => {
    const g = grid(['T T S T T K', 'K L Y W G P', 'L Y W G P R', 'Y W G P R T', 'W G P R T K']);
    expect(findClusters(g, BET)).toEqual([]);
  });

  it('is deterministic and ordered by symbol then position', () => {
    const rows = ['G G G G G K', 'T T T T T P', 'L Y W Y P R', 'Y W G P R T', 'W K P R T K'];
    const a = findClusters(grid(rows), BET);
    const b = findClusters(grid(rows), BET);
    expect(a).toEqual(b);
    expect(a.map((x) => x.sym)).toEqual([Sym.TOKEN, Sym.PIGEON]);
  });

  it('caps cluster pay at the largest size bucket', () => {
    expect(clusterPay(Sym.TOKEN, 30)).toBe(clusterPay(Sym.TOKEN, 20));
    expect(clusterPay(Sym.TOKEN, 4)).toBe(0);
  });
});
