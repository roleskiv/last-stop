import { useGame, useUI } from './context';
import { BalanceDisplay } from './BalanceDisplay';
import { BetControls } from './BetControls';
import { SpinButton } from './SpinButton';
import { AutoIcon, GearIcon, InfoIcon, TurboIcon } from './icons';

/** Bottom control bar. Sits in the DOM above the Pixi canvas. */
export function Hud() {
  const game = useGame();
  const turbo = useUI((s) => s.turbo);
  const auto = useUI((s) => s.autoplayActive);
  const autoLeft = useUI((s) => s.autoplayRemaining);
  const busy = useUI((s) => s.gameState !== 'READY');
  const inBonus = useUI((s) => s.freeSpins !== null);

  return (
    <div className="hud">
      <div className="hud-side hud-left">
        <button className="icon-btn" aria-label="Settings" onClick={() => game.openModal('settings')}>
          <GearIcon />
        </button>
        <button className="icon-btn" aria-label="Paytable and rules" onClick={() => game.openModal('paytable')}>
          <InfoIcon />
        </button>
        <BalanceDisplay />
      </div>
      <div className="hud-center">
        <button
          className={`icon-btn pill ${auto ? 'active' : ''}`}
          aria-label={auto ? 'Stop autoplay' : 'Autoplay'}
          disabled={!auto && (busy || inBonus)}
          onClick={() => (auto ? game.stopAutoplay() : game.openModal('autoplay'))}
        >
          <AutoIcon />
          {auto && <span className="auto-count">{autoLeft}</span>}
        </button>
        <SpinButton />
        <button className={`icon-btn pill ${turbo ? 'active' : ''}`} aria-pressed={turbo} aria-label="Turbo" onClick={() => game.setTurbo(!turbo)}>
          <TurboIcon />
        </button>
      </div>
      <div className="hud-side hud-right">
        <div className="mobile-menu">
          <button className="icon-btn" aria-label="Settings" onClick={() => game.openModal('settings')}>
            <GearIcon />
          </button>
          <button className="icon-btn" aria-label="Paytable and rules" onClick={() => game.openModal('paytable')}>
            <InfoIcon />
          </button>
        </div>
        <BetControls />
      </div>
    </div>
  );
}
