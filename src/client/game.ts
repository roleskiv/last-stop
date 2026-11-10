import type { Controller } from './core/controller.ts';

let instance: Controller | null = null;
export const setGame = (c: Controller): void => { instance = c; };
/** The running game controller. Only valid after boot. */
export const game = (): Controller => {
  if (!instance) throw new Error('Game not started');
  return instance;
};
