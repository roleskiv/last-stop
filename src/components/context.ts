import { createContext, useContext } from 'react';
import type { GameController } from '../state/GameController';
import { useStore } from '../state/store';
import type { UIState } from '../state/store';

export const GameContext = createContext<GameController | null>(null);

export function useGame(): GameController {
  const g = useContext(GameContext);
  if (!g) throw new Error('GameContext missing');
  return g;
}

export function useUI<T>(selector: (s: UIState) => T): T {
  return useStore(useGame().store, selector);
}

export const credits = (centi: number): string =>
  (centi / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
