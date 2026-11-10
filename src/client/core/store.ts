import { useSyncExternalStore } from 'react';
import type { OperatorConfig } from '../../shared/operator.ts';
import type { PublicGameInfo, RoundEnvelope, SessionStats } from '../../shared/protocol.ts';

export type Phase = 'loading' | 'idle' | 'spinning' | 'bonus' | 'error';
export type ModalName = null | 'paytable' | 'history' | 'settings' | 'autoplay' | 'buy' | 'bet' | 'reality' | 'menu';

export interface AutoplayState {
  left: number;
  lossLimit: number;      // 0 = none, in minor units
  singleWinLimit: number; // 0 = none
  startBalance: number;
}

export interface UiState {
  phase: Phase;
  loadProgress: number;
  operator: OperatorConfig | null;
  game: PublicGameInfo | null;
  balance: number;
  bet: number;
  /** Win shown in the win field for the current round. */
  win: number;
  stats: SessionStats | null;
  turbo: boolean;
  autoplay: AutoplayState | null;
  modal: ModalName;
  /** Free spins. */
  bonus: { left: number; total: number; win: number } | null;
  message: string;
  error: { title: string; text: string; fatal: boolean } | null;
  sound: boolean;
  music: boolean;
  volume: number;
  history: RoundEnvelope[];
  replaying: boolean;
  canSkip: boolean;
  /** True until the player's first gesture (audio unlock / intro screen). */
  needsStart: boolean;
  layout: { portrait: boolean; w: number; h: number; scale: number; x: number; y: number };
}

const initial: UiState = {
  phase: 'loading', loadProgress: 0, operator: null, game: null, balance: 0, bet: 0, win: 0, stats: null,
  turbo: false, autoplay: null, modal: null, bonus: null, message: '', error: null,
  sound: true, music: true, volume: 0.8, history: [], replaying: false, canSkip: false, needsStart: true,
  layout: { portrait: false, w: 1920, h: 1080, scale: 1, x: 0, y: 0 },
};

let state = initial;
const listeners = new Set<() => void>();

export const store = {
  get: (): UiState => state,
  set(patch: Partial<UiState>): void {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useStore<T>(selector: (s: UiState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(state));
}
