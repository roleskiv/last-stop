import { useEffect, useState, type ReactElement } from 'react';
import { clockTime, duration, money } from '../core/format.ts';
import { store, useStore } from '../core/store.ts';
import { game } from '../game.ts';
import { IconAuto, IconBolt, IconMenu, IconMinus, IconMute, IconPlus, IconSkip, IconSound, IconSpin, IconStop, IconTicket } from './icons.tsx';

function StatusLine(): ReactElement | null {
  const op = useStore((s) => s.operator);
  const stats = useStore((s) => s.stats);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!op || !stats) return null;
  const net = stats.won - stats.wagered;
  return (
    <div className="status" aria-label="Session information">
      {op.showClock && <span>{clockTime()}</span>}
      {op.showClock && <span>Session {duration(Date.now() - stats.startedAt)}</span>}
      {op.showNetPosition && <span>Net {net > 0 ? '+' : ''}{money(net)}</span>}
      {game().isDemoWallet && <span className="demo-tag">DEMO PLAY</span>}
    </div>
  );
}

function SpinButton(): ReactElement {
  const phase = useStore((s) => s.phase);
  const auto = useStore((s) => s.autoplay);
  const canSkip = useStore((s) => s.canSkip);
  const bonus = useStore((s) => s.bonus);
  const idle = phase === 'idle';
  let icon = <IconSpin />;
  let label = 'Spin';
  if (auto) { icon = <IconStop />; label = 'Stop autoplay'; }
  else if (!idle && canSkip) { icon = <IconSkip />; label = 'Skip'; }
  return (
    <button
      type="button" className={`spin ${idle ? 'ready' : 'busy'} ${auto ? 'auto' : ''}`} aria-label={label}
      disabled={!idle && !canSkip && !auto}
      onClick={() => (auto ? game().stopAutoplay() : game().primary())}
    >
      <span className="spin-ring" />
      <span className="spin-icon">{icon}</span>
      {auto && <span className="spin-count">{auto.left}</span>}
      {!auto && bonus && <span className="spin-count">{bonus.left}</span>}
    </button>
  );
}

export function Hud(): ReactElement | null {
  const layout = useStore((s) => s.layout);
  const phase = useStore((s) => s.phase);
  const op = useStore((s) => s.operator);
  const gameInfo = useStore((s) => s.game);
  const balance = useStore((s) => s.balance);
  const bet = useStore((s) => s.bet);
  const win = useStore((s) => s.win);
  const turbo = useStore((s) => s.turbo);
  const auto = useStore((s) => s.autoplay);
  const bonus = useStore((s) => s.bonus);
  const sound = useStore((s) => s.sound);
  const replaying = useStore((s) => s.replaying);
  const message = useStore((s) => s.message);
  if (!op || !gameInfo || phase === 'loading') return null;
  const idle = phase === 'idle' && !auto;
  const bets = op.bets;
  const betIndex = bets.indexOf(bet);
  const buyPrice = bet * gameInfo.buyPriceBets;

  return (
    <div
      className={`hud ${layout.portrait ? 'portrait' : 'landscape'}`}
      style={{ width: layout.w, height: layout.h, transform: `translate(${layout.x}px, ${layout.y}px) scale(${layout.scale})` }}
    >
      <StatusLine />
      {replaying && <div className="replay-tag">REPLAY</div>}
      {message && <div className="hud-message">{message}</div>}

      {bonus ? (
        <div className="bonus-panel" role="status">
          <div className="bonus-title">MIDNIGHT TRAIN</div>
          <div className="bonus-row"><span>FREE SPINS LEFT</span><b>{bonus.left}</b></div>
          <div className="bonus-row"><span>BONUS WIN</span><b>{money(bonus.win)}</b></div>
        </div>
      ) : op.features.buy ? (
        <button type="button" className="buy" disabled={!idle || buyPrice > balance} onClick={() => store.set({ modal: 'buy' })}>
          <span className="buy-icon"><IconTicket /></span>
          <span className="buy-text"><b>EXPRESS TICKET</b><i>BUY BONUS {money(buyPrice)}</i></span>
        </button>
      ) : null}

      <div className="win-field" aria-live="polite">
        <span className="label">WIN</span>
        <span className={`value ${win > 0 ? 'on' : ''}`}>{money(win)}</span>
        {win > 0 && phase === 'idle' && <span key={win} className="win-flare" />}
      </div>

      <div className="bar">
        <button type="button" className="round" aria-label="Menu" onClick={() => store.set({ modal: 'menu' })}><IconMenu /></button>
        <button
          type="button" className="round sound-btn" aria-label={sound ? 'Mute' : 'Unmute'} aria-pressed={!sound}
          onClick={() => { store.set({ sound: !sound, music: !sound }); game().savePrefs(); }}
        >{sound ? <IconSound /> : <IconMute />}</button>
        <div className="field balance"><span className="label">{game().isDemoWallet ? 'DEMO BALANCE' : 'BALANCE'}</span><span className="value">{money(balance)}</span></div>
        <div className="field bet">
          <button type="button" className="step" aria-label="Lower bet" disabled={!idle || betIndex <= 0} onClick={() => game().stepBet(-1)}><IconMinus /></button>
          <button type="button" className="bet-value" disabled={!idle} onClick={() => store.set({ modal: 'bet' })} aria-label="Choose bet">
            <span className="label">BET</span><span className="value">{money(bet)}</span>
          </button>
          <button type="button" className="step" aria-label="Raise bet" disabled={!idle || betIndex >= bets.length - 1} onClick={() => game().stepBet(1)}><IconPlus /></button>
        </div>
      </div>

      <div className="controls">
        {op.features.autoplay && (
          <button
            type="button" className={`round auto-btn ${auto ? 'active' : ''}`} aria-label="Autoplay" disabled={phase !== 'idle' && !auto}
            onClick={() => (auto ? game().stopAutoplay() : store.set({ modal: 'autoplay' }))}
          ><IconAuto /></button>
        )}
        <SpinButton />
        {op.features.turbo && (
          <button type="button" className={`round turbo-btn ${turbo ? 'active' : ''}`} aria-label="Turbo" aria-pressed={turbo} onClick={() => game().toggleTurbo()}><IconBolt /></button>
        )}
      </div>
    </div>
  );
}
