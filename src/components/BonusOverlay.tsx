import { useEffect } from 'react';
import { credits, useGame, useUI } from './context';
import { Rolling } from './BalanceDisplay';

/** "MIDNIGHT TRAIN" arrival board. Skippable; the bonus outcome is already fixed. */
export function BonusIntroOverlay() {
  const game = useGame();
  const intro = useUI((s) => s.bonusIntro);
  const turbo = useUI((s) => s.turbo);
  useEffect(() => {
    if (!intro) return;
    const t = window.setTimeout(() => game.introDone(), turbo ? 2600 : 4200);
    return () => window.clearTimeout(t);
  }, [intro, game, turbo]);
  if (!intro) return null;
  return (
    <div className="bonus-intro" key={intro.key} onClick={() => game.introDone()}>
      <div className="arrival-board">
        <div className="board-head">
          <span>NOW ARRIVING</span>
          <span className="board-clock">00:00</span>
        </div>
        <div className="board-title">
          {'MIDNIGHT TRAIN'.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${0.4 + i * 0.06}s` }}>{ch === ' ' ? ' ' : ch}</span>
          ))}
        </div>
        <div className="board-sub">
          {intro.scatters} trains spotted · <b>{intro.spins} FREE SPINS</b>
        </div>
        <div className="board-rules">Haunted platforms stay haunted for the whole ride.</div>
        <button className="board-btn" onClick={(e) => (e.stopPropagation(), game.introDone())}>
          All aboard
        </button>
      </div>
    </div>
  );
}

export function BonusOutroOverlay() {
  const game = useGame();
  const outro = useUI((s) => s.bonusOutro);
  useEffect(() => {
    if (!outro) return;
    const t = window.setTimeout(() => game.outroDone(), 5000);
    return () => window.clearTimeout(t);
  }, [outro, game]);
  if (!outro) return null;
  return (
    <div className="bonus-outro" key={outro.key} onClick={() => game.outroDone()}>
      <div className="outro-card">
        <div className="outro-kicker">END OF THE LINE</div>
        <div className="outro-title">Midnight Train total</div>
        <div className="outro-amount">{credits(outro.win)}</div>
        <div className="outro-sub">{outro.spins} free spins played · demo credits</div>
        <button className="board-btn" onClick={(e) => (e.stopPropagation(), game.outroDone())}>
          Collect
        </button>
      </div>
    </div>
  );
}

export function FreeSpinsBar() {
  const fs = useUI((s) => s.freeSpins);
  if (!fs) return null;
  return (
    <div className="fs-bar" role="status">
      <div className="fs-item">
        <span className="label">Free spins left</span>
        <span className="value">{fs.remaining}</span>
      </div>
      <div className="fs-title">MIDNIGHT TRAIN</div>
      <div className="fs-item">
        <span className="label">Bonus win</span>
        <Rolling value={fs.bonusWin} className="value" />
      </div>
      {fs.retrigger ? <div className="fs-retrigger">+{fs.retrigger} spins</div> : null}
    </div>
  );
}
