import type { ReactElement } from 'react';
import { useStore } from '../core/store.ts';
import { game } from '../game.ts';
import { BASE } from '../stage/assets.ts';
import { Hud } from './Hud.tsx';
import { Modals } from './Modals.tsx';
import { IconPlay } from './icons.tsx';

function Loading(): ReactElement {
  const progress = useStore((s) => s.loadProgress);
  return (
    <div className="splash">
      <img className="splash-logo" src={`${BASE}assets/logo.png`} alt="LAST STOP: Midnight Line" />
      <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
      <p className="splash-note">Arriving at the platform…</p>
    </div>
  );
}

function Start({ onStart }: { onStart: () => void }): ReactElement {
  const g = useStore((s) => s.game)!;
  return (
    <div className="splash start">
      <img className="splash-logo" src={`${BASE}assets/logo.png`} alt="LAST STOP: Midnight Line" />
      <div className="cards">
        <div className="card"><img src={`${BASE}assets/symbols/sign.png`} alt="" /><b>Phantom Platforms</b><span>Haunted tiles multiply wins, up to x{g.ladder[g.ladder.length - 1]} each</span></div>
        <div className="card"><img src={`${BASE}assets/symbols/scatter.png`} alt="" /><b>Midnight Train</b><span>Up to {g.freeSpins[g.freeSpins.length - 1]} free spins where platforms never clear</span></div>
        <div className="card"><img src={`${BASE}assets/symbols/punch.png`} alt="" /><b>Ticket Punch</b><span>Conductor Graves punches symbols into Wilds</span></div>
      </div>
      <p className="splash-facts">Win up to {g.maxWinBets.toLocaleString()}x your bet · RTP {g.rtp.toFixed(1)}%</p>
      <button type="button" className="btn primary big" onClick={onStart} autoFocus><IconPlay /> {game().isDemoWallet ? 'Play demo' : 'Play'}</button>
      <p className="splash-note">{game().isDemoWallet ? 'Demo play with play money. No real money can be won or lost.' : '18+. Please play responsibly.'}</p>
    </div>
  );
}

export function App({ onStart }: { onStart: () => void }): ReactElement {
  const phase = useStore((s) => s.phase);
  const needsStart = useStore((s) => s.needsStart);
  const error = useStore((s) => s.error);
  if (phase === 'loading') return error ? <Modals /> : <Loading />;
  return (
    <>
      <Hud />
      {needsStart && <Start onStart={onStart} />}
      <Modals />
    </>
  );
}
