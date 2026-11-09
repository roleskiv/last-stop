/** Core game configuration. Changing these values changes the math; re-run `npm run simulate`. */
export const GRID_COLS = 6;
export const GRID_ROWS = 5;
export const GRID_SIZE = GRID_COLS * GRID_ROWS;

/** Credits are stored internally in hundredths ("centi-credits") so payouts never drift. */
export const CREDIT_SCALE = 100;

export const gameConfig = {
  cols: GRID_COLS,
  rows: GRID_ROWS,
  minClusterSize: 5,
  startingBalance: 10_000,
  defaultBet: 10,
  bets: [1, 2, 5, 10, 20, 50, 100] as const,
  autoplayOptions: [10, 25, 50] as const,
  /** Hard guard: a single round can never cascade more than this many times. */
  maxCascades: 60,
  /** Total win for one paid spin (base + bonus) is capped at this multiple of the bet. */
  maxWinMultiplier: 5000,
  /** Win presentation tiers, as win / bet. */
  winTiers: {
    medium: 3,
    big: 15,
    mega: 50,
    legendary: 200,
  },
} as const;

export type WinTier = 'none' | 'small' | 'medium' | 'big' | 'mega' | 'legendary';

export function winTierFor(win: number, bet: number): WinTier {
  if (win <= 0 || bet <= 0) return 'none';
  const x = win / bet;
  const t = gameConfig.winTiers;
  if (x >= t.legendary) return 'legendary';
  if (x >= t.mega) return 'mega';
  if (x >= t.big) return 'big';
  if (x >= t.medium) return 'medium';
  return 'small';
}
