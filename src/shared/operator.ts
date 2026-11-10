/**
 * Operator / jurisdiction configuration.
 *
 * Everything an operator is likely to need to switch per market is data here, enforced by
 * the game service (server side) and mirrored by the client UI. Nothing in the client can
 * re-enable a feature that the server has switched off.
 */
export interface OperatorConfig {
  profile: string;
  /** ISO 4217 code. "FUN" is used for demo play. */
  currency: string;
  /** Number of decimal places of the currency's minor unit. */
  currencyDecimals: number;
  mathId: string;
  /** Allowed bets in minor units. Every bet must be a multiple of the math's coinsPerBet. */
  bets: number[];
  defaultBet: number;
  features: {
    /** Express Ticket bonus buy. */
    buy: boolean;
    autoplay: boolean;
    /** Faster animation. Never changes results. */
    turbo: boolean;
    /** Let the player skip the rest of an animation (slam stop). */
    skip: boolean;
  };
  /** Minimum time from one spin start to the next, in milliseconds. 0 means no limit. */
  minSpinMs: number;
  autoplay: {
    spinOptions: number[];
    /** The player must set a loss limit before autoplay can start. */
    requireLossLimit: boolean;
    /** Autoplay always stops when a bonus is won. */
    stopOnBonus: boolean;
  };
  /** Interval of the reality check reminder in minutes. 0 means off. */
  realityCheckMinutes: number;
  /** Show net position (won minus wagered) for the session. */
  showNetPosition: boolean;
  /** Show the time of day and session duration. */
  showClock: boolean;
  /** Starting balance of the built-in demo wallet, in minor units. */
  demoBalance: number;
}

const BETS = [20, 40, 60, 80, 100, 200, 300, 500, 1000, 2000, 5000, 10000];

export const OPERATOR_PROFILES: Record<string, OperatorConfig> = {
  /** Free-play demo with every feature on. */
  demo: {
    profile: 'demo', currency: 'FUN', currencyDecimals: 2, mathId: 'LS2-96',
    bets: BETS, defaultBet: 100,
    features: { buy: true, autoplay: true, turbo: true, skip: true },
    minSpinMs: 0,
    autoplay: { spinOptions: [10, 25, 50, 100], requireLossLimit: false, stopOnBonus: true },
    realityCheckMinutes: 0, showNetPosition: true, showClock: true, demoBalance: 500000,
  },
  /** Typical EU remote licence (for example MGA): loss limit required for autoplay, hourly reminder. */
  eu: {
    profile: 'eu', currency: 'EUR', currencyDecimals: 2, mathId: 'LS2-96',
    bets: BETS, defaultBet: 100,
    features: { buy: true, autoplay: true, turbo: true, skip: true },
    minSpinMs: 0,
    autoplay: { spinOptions: [10, 25, 50, 100], requireLossLimit: true, stopOnBonus: true },
    realityCheckMinutes: 60, showNetPosition: true, showClock: true, demoBalance: 500000,
  },
  /**
   * Great Britain (UKGC RTS 8 and 14, online slots stake limit): no autoplay, no turbo,
   * no slam stop, no bonus buy, 2.5 s minimum spin cycle, GBP 5 maximum stake,
   * net position and elapsed time always visible.
   */
  uk: {
    profile: 'uk', currency: 'GBP', currencyDecimals: 2, mathId: 'LS2-94',
    bets: BETS.filter((b) => b <= 500), defaultBet: 100,
    features: { buy: false, autoplay: false, turbo: false, skip: false },
    minSpinMs: 2500,
    autoplay: { spinOptions: [], requireLossLimit: true, stopOnBonus: true },
    realityCheckMinutes: 60, showNetPosition: true, showClock: true, demoBalance: 500000,
  },
};

export function getOperator(profile: string | null | undefined): OperatorConfig {
  return OPERATOR_PROFILES[profile ?? 'demo'] ?? OPERATOR_PROFILES.demo;
}
