import { gameConfig } from '../config/gameConfig';
import { useGame } from './context';
import { Modal } from './Modal';

export function AutoplayMenu() {
  const game = useGame();
  return (
    <Modal title="Autoplay">
      <p className="muted">Autoplay plays demo spins at your current bet and stops automatically when credits run out. Press the spin button at any time to stop.</p>
      <div className="choice-row">
        {gameConfig.autoplayOptions.map((n) => (
          <button key={n} className="choice" onClick={() => game.startAutoplay(n)}>
            {n}
            <small>spins</small>
          </button>
        ))}
      </div>
    </Modal>
  );
}
