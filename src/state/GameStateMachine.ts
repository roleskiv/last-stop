export type GameState =
  | 'LOADING'
  | 'READY'
  | 'SPINNING'
  | 'EVALUATING'
  | 'CASCADING'
  | 'FEATURE_ACTIVE'
  | 'BONUS_INTRO'
  | 'FREE_SPINS'
  | 'BONUS_OUTRO'
  | 'WIN_PRESENTATION'
  | 'ERROR';

/** Allowed transitions. Anything else is a bug and is rejected. */
const TRANSITIONS: Record<GameState, GameState[]> = {
  LOADING: ['READY', 'ERROR'],
  READY: ['SPINNING', 'ERROR'],
  SPINNING: ['EVALUATING', 'FEATURE_ACTIVE', 'ERROR'],
  EVALUATING: ['CASCADING', 'FEATURE_ACTIVE', 'WIN_PRESENTATION', 'BONUS_INTRO', 'FREE_SPINS', 'BONUS_OUTRO', 'READY', 'ERROR'],
  CASCADING: ['EVALUATING', 'FEATURE_ACTIVE', 'ERROR'],
  FEATURE_ACTIVE: ['EVALUATING', 'CASCADING', 'ERROR'],
  BONUS_INTRO: ['FREE_SPINS', 'ERROR'],
  FREE_SPINS: ['SPINNING', 'BONUS_OUTRO', 'ERROR'],
  BONUS_OUTRO: ['WIN_PRESENTATION', 'READY', 'ERROR'],
  WIN_PRESENTATION: ['READY', 'ERROR'],
  ERROR: ['READY'],
};

export class GameStateMachine {
  private _state: GameState = 'LOADING';
  private listeners = new Set<(s: GameState, prev: GameState) => void>();
  readonly history: GameState[] = ['LOADING'];

  get state(): GameState {
    return this._state;
  }

  can(next: GameState): boolean {
    return next === this._state || TRANSITIONS[this._state].includes(next);
  }

  to(next: GameState): void {
    if (next === this._state) return;
    if (!this.can(next)) throw new Error(`Illegal state transition ${this._state} -> ${next}`);
    const prev = this._state;
    this._state = next;
    this.history.push(next);
    if (this.history.length > 200) this.history.shift();
    this.listeners.forEach((l) => l(next, prev));
  }

  onChange(fn: (s: GameState, prev: GameState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
