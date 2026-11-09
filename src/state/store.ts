import { useSyncExternalStore } from 'react';
import type { WinTier } from '../config/gameConfig';
import type { GameState } from './GameStateMachine';

export interface BannerState {
  tier: WinTier;
  /** Amount in centi-credits the counter is rolling to. */
  amount: number;
  key: number;
}

export interface UIState {
  gameState: GameState;
  loadingProgress: number;
  /** All amounts are centi-credits. */
  balance: number;
  bet: number;
  lastWin: number;
  /** Win counter for the current spin as it accumulates. */
  spinWin: number;
  turbo: boolean;
  autoplayRemaining: number;
  autoplayActive: boolean;
  freeSpins: null | { remaining: number; total: number; played: number; bonusWin: number; retrigger?: number };
  haunted: number;
  hauntedCap: number;
  stationProgress: number;
  info: string;
  banner: BannerState | null;
  bonusIntro: null | { spins: number; scatters: number; key: number };
  bonusOutro: null | { win: number; spins: number; key: number };
  modal: null | 'paytable' | 'settings' | 'autoplay';
  canSkip: boolean;
  message: string | null;
  reducedMotion: boolean;
  orientation: 'landscape' | 'portrait';
}

type Listener = () => void;

/** Tiny external store: the Pixi game loop writes, React components read selectively. */
export class Store {
  private state: UIState;
  private listeners = new Set<Listener>();
  constructor(initial: UIState) {
    this.state = initial;
  }
  get(): UIState {
    return this.state;
  }
  set(patch: Partial<UIState>): void {
    let changed = false;
    for (const k in patch) {
      if ((patch as Record<string, unknown>)[k] !== (this.state as unknown as Record<string, unknown>)[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
}

export function useStore<T>(store: Store, selector: (s: UIState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}
