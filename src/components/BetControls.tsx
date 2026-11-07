import { gameConfig } from '../config/gameConfig';
import { credits, useGame, useUI } from './context';
import { MinusIcon, PlusIcon } from './icons';

export function BetControls() {
  const game = useGame();
  const bet = useUI((s) => s.bet);
  const busy = useUI((s) => s.gameState !== 'READY' || s.autoplayActive);
  const bets = gameConfig.bets as readonly number[];
  const i = bets.indexOf(bet / 100);
  return (
    <div className="bet">
      <button className="round-btn" aria-label="Decrease bet" disabled={busy || i <= 0} onClick={() => game.changeBet(-1)}>
        <MinusIcon />
      </button>
      <div className="readout bet-readout">
        <span className="label">Bet</span>
        <span className="value">{credits(bet)}</span>
      </div>
      <button className="round-btn" aria-label="Increase bet" disabled={busy || i >= bets.length - 1} onClick={() => game.changeBet(1)}>
        <PlusIcon />
      </button>
    </div>
  );
}
