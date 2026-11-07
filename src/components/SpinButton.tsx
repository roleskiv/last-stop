import { useGame, useUI } from './context';
import { SkipIcon, SpinIcon, StopIcon } from './icons';

export function SpinButton() {
  const game = useGame();
  const state = useUI((s) => s.gameState);
  const canSkip = useUI((s) => s.canSkip);
  const auto = useUI((s) => s.autoplayActive);
  const balance = useUI((s) => s.balance);
  const bet = useUI((s) => s.bet);
  const ready = state === 'READY';
  const spinning = !ready && state !== 'LOADING';

  const onClick = () => {
    if (auto) return game.stopAutoplay();
    if (canSkip) return game.skip();
    void game.spin();
  };
  const label = auto ? 'Stop autoplay' : canSkip ? 'Skip animation' : 'Spin';
  return (
    <button
      className={`spin-btn ${spinning ? 'spinning' : ''} ${auto ? 'auto' : ''} ${ready && balance < bet ? 'low' : ''}`}
      aria-label={label}
      title={`${label} (Space)`}
      disabled={state === 'LOADING' || state === 'ERROR'}
      onClick={onClick}
    >
      <span className="spin-ring" />
      <span className="spin-icon">{auto ? <StopIcon /> : canSkip && spinning ? <SkipIcon /> : <SpinIcon />}</span>
    </button>
  );
}
