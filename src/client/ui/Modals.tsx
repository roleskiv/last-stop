import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { PAYING_COUNT, SYMBOL_KEYS, SYMBOL_NAMES } from '../../math/symbols.ts';
import { audio } from '../audio/audio.ts';
import { duration, money } from '../core/format.ts';
import { store, useStore } from '../core/store.ts';
import { game } from '../game.ts';
import { BASE } from '../stage/assets.ts';
import { IconClose, IconGear, IconHistory, IconInfo, IconPlay } from './icons.tsx';

const close = (): void => store.set({ modal: null });
const sym = (i: number): string => `${BASE}assets/symbols/${SYMBOL_KEYS[i]}.png`;

function Dialog({ title, children, wide, onClose = close, footer }: { title: string; children: ReactNode; wide?: boolean; onClose?: (() => void) | null; footer?: ReactNode }): ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onPointerDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={`dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          {onClose && <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><IconClose /></button>}
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

function Menu(): ReactElement {
  return (
    <Dialog title="Menu">
      <div className="menu-list">
        <button type="button" onClick={() => store.set({ modal: 'paytable' })}><IconInfo /><span>Paytable and rules</span></button>
        <button type="button" onClick={() => void game().openHistory()}><IconHistory /><span>Game history</span></button>
        <button type="button" onClick={() => store.set({ modal: 'settings' })}><IconGear /><span>Settings</span></button>
      </div>
    </Dialog>
  );
}

function Paytable(): ReactElement {
  const g = useStore((s) => s.game)!;
  const op = useStore((s) => s.operator)!;
  const bet = useStore((s) => s.bet);
  const coin = bet / g.coinsPerBet;
  const sizes = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const order = Array.from({ length: PAYING_COUNT }, (_, i) => PAYING_COUNT - 1 - i);
  const fs = g.freeSpins, rt = g.retrigger;
  return (
    <Dialog title="Paytable and rules" wide>
      <p className="lead">Pays are shown for your current bet of <b>{money(bet)}</b>.</p>
      <h3>Cluster pays</h3>
      <p>Land 5 or more matching symbols connected side by side or one above the other to win. Diagonals do not connect. Every cluster on the board pays.</p>
      <div className="pay-scroll">
        <table className="pay">
          <thead><tr><th>Symbol</th>{sizes.map((n) => <th key={n}>{n}{n === 15 ? '+' : ''}</th>)}</tr></thead>
          <tbody>
            {order.map((s) => (
              <tr key={s}>
                <td className="sym"><img src={sym(s)} alt="" /><span>{SYMBOL_NAMES[s]}</span></td>
                {sizes.map((n) => <td key={n}>{money(g.pay[s][n] * coin)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Cascades</h3>
      <p>Winning symbols are removed, the symbols above fall into the gaps and new symbols drop in from the top. Cascades continue until no new cluster forms. All wins from one spin are added together.</p>

      <div className="feature">
        <img src={sym(8)} alt="" />
        <div><h3>Conductor Graves (Wild)</h3><p>Substitutes for every paying symbol. One Wild can be part of several clusters at once. Wilds do not pay on their own.</p></div>
      </div>
      <div className="feature">
        <img src={sym(10)} alt="" />
        <div><h3>Phantom Platforms</h3><p>A Platform Sign haunts the tile it lands on, then flips into a paying symbol. A haunted tile starts at x{g.ladder[0]}. A cluster that covers haunted tiles is multiplied by the sum of their values. After the win, each of those tiles steps up: {g.ladder.map((m) => `x${m}`).join(', ')}. A sign that lands on a haunted tile also steps it up. In the base game haunted tiles are cleared before each new spin.</p></div>
      </div>
      <div className="feature">
        <img src={sym(11)} alt="" />
        <div><h3>Ticket Punch</h3><p>Conductor Graves punches the ticket: the Ticket Punch becomes a Wild and 1 to 3 more paying symbols, chosen at random, also become Wilds.</p></div>
      </div>
      <div className="feature">
        <img src={sym(9)} alt="" />
        <div>
          <h3>Midnight Train free spins</h3>
          <p>3, 4, 5 or 6+ Scatters on the first drop of a spin award {fs[3]}, {fs[4]}, {fs[5]} or {fs[6]} free spins. Each triggering Scatter haunts its tile. During free spins haunted tiles and their multipliers stay for the whole ride, and Platform Signs land more often. 3, 4, 5 or 6+ Scatters during the ride add {rt[3]}, {rt[4]}, {rt[5]} or {rt[6]} spins, up to {g.maxFreeSpins} spins in total. Free spins are played at the bet of the triggering spin.</p>
        </div>
      </div>
      {op.features.buy && (
        <div className="feature">
          <img src={sym(9)} alt="" />
          <div><h3>Express Ticket (bonus buy)</h3><p>For {g.buyPriceBets}x your bet ({money(bet * g.buyPriceBets)}), the next spin is guaranteed to land at least 3 Scatters and start the Midnight Train. The theoretical return of the Express Ticket is the same as the game's, {g.rtp.toFixed(1)}%.</p></div>
        </div>
      )}

      <h3>Order of play</h3>
      <p>After every drop: Platform Signs activate, then Ticket Punches, then clusters are paid and removed. Scatters are counted on the first drop of each spin and are never removed by cascades.</p>

      <h3>General</h3>
      <ul>
        <li>The maximum win from one paid spin, including its free spins, is {g.maxWinBets.toLocaleString()}x the bet. When it is reached the round ends and that amount is paid.</li>
        <li>The theoretical return to player (RTP) of this game is {g.rtp.toFixed(1)}%. It is the long-term average return and is not a prediction for any single session.</li>
        <li>Every result is decided by a random number generator at the moment the spin is requested. Results do not depend on earlier results, on your bet or on your balance. Turbo and skip only shorten animations.</li>
        <li>If a game is interrupted, the result has already been decided and settled. The unfinished round is shown again the next time the game is opened, and it is listed in Game history.</li>
        <li>Malfunction voids all pays and plays.</li>
        {game().isDemoWallet && <li>This is demo play with play money. Nothing can be deposited, withdrawn or won.</li>}
      </ul>
      <p className="fine">LAST STOP: Midnight Line. Game version 2.0.0, math {g.mathId}.</p>
    </Dialog>
  );
}

function History(): ReactElement {
  const rounds = useStore((s) => s.history);
  const idle = useStore((s) => s.phase === 'idle');
  return (
    <Dialog title="Game history" wide>
      {rounds.length === 0 && <p>No rounds played yet.</p>}
      <div className="history">
        {rounds.map((r) => (
          <div className="history-row" key={r.roundId}>
            <div className="h-main">
              <b>#{r.seq} {r.mode === 'buy' ? 'Express Ticket' : 'Spin'}{r.record.free.length ? ` + ${r.record.free.length} free spins` : ''}</b>
              <span>{new Date(r.time).toLocaleString()} · ID {r.roundId.slice(0, 8)}</span>
            </div>
            <div className="h-num"><span>Paid</span><b>{money(r.stake)}</b></div>
            <div className="h-num"><span>Won</span><b className={r.win > 0 ? 'pos' : ''}>{money(r.win)}</b></div>
            <button type="button" className="btn small" disabled={!idle} onClick={() => void game().replay(r)}><IconPlay /> Replay</button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }): ReactElement {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <i />
    </label>
  );
}

function Settings(): ReactElement {
  const s = useStore((x) => x);
  const set = (patch: Parameters<typeof store.set>[0]): void => { store.set(patch); game().savePrefs(); };
  return (
    <Dialog title="Settings">
      <Toggle label="Sound effects" on={s.sound} onChange={(v) => set({ sound: v })} />
      <Toggle label="Music" on={s.music} onChange={(v) => set({ music: v })} />
      <label className="slider"><span>Volume</span>
        <input type="range" min="0" max="1" step="0.05" value={s.volume} onChange={(e) => set({ volume: Number(e.target.value) })} />
      </label>
      {s.operator!.features.turbo && <Toggle label="Turbo (faster animations)" on={s.turbo} onChange={() => game().toggleTurbo()} />}
      {game().isDemoWallet && (
        <button type="button" className="btn ghost" disabled={s.phase !== 'idle'} onClick={() => void game().resetDemoBalance()}>Reset demo balance</button>
      )}
    </Dialog>
  );
}

function Chips<T extends number>({ options, value, onChange, format }: { options: T[]; value: T; onChange: (v: T) => void; format: (v: T) => string }): ReactElement {
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o} className={o === value ? 'on' : ''} aria-pressed={o === value} onClick={() => { audio.play('click'); onChange(o); }}>{format(o)}</button>
      ))}
    </div>
  );
}

function Autoplay(): ReactElement {
  const op = useStore((s) => s.operator)!;
  const bet = useStore((s) => s.bet);
  const balance = useStore((s) => s.balance);
  const [spins, setSpins] = useState(op.autoplay.spinOptions[0] ?? 10);
  const [loss, setLoss] = useState(op.autoplay.requireLossLimit ? 20 : 0);
  const [single, setSingle] = useState(0);
  const lossOptions = op.autoplay.requireLossLimit ? [10, 20, 50, 100] : [0, 10, 20, 50, 100];
  return (
    <Dialog
      title="Autoplay"
      footer={<button type="button" className="btn primary" disabled={bet > balance} onClick={() => game().startAutoplay(spins, loss * bet, single * bet)}>Start {spins} spins</button>}
    >
      <h3>Number of spins</h3>
      <Chips options={op.autoplay.spinOptions} value={spins} onChange={setSpins} format={String} />
      <h3>Stop if my balance falls by</h3>
      <Chips options={lossOptions} value={loss} onChange={setLoss} format={(v) => (v === 0 ? 'No limit' : money(v * bet))} />
      <h3>Stop if a single win reaches</h3>
      <Chips options={[0, 20, 50, 100]} value={single} onChange={setSingle} format={(v) => (v === 0 ? 'No limit' : money(v * bet))} />
      <p className="fine">Autoplay uses your current bet of {money(bet)}.{op.autoplay.stopOnBonus ? ' It always stops when the Midnight Train bonus is won.' : ''} You can stop it at any time with the spin button.</p>
    </Dialog>
  );
}

function Buy(): ReactElement {
  const g = useStore((s) => s.game)!;
  const bet = useStore((s) => s.bet);
  const balance = useStore((s) => s.balance);
  const price = bet * g.buyPriceBets;
  return (
    <Dialog
      title="Express Ticket"
      footer={<>
        <button type="button" className="btn ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn primary" disabled={price > balance} onClick={() => game().buyBonus()}>Buy for {money(price)}</button>
      </>}
    >
      <div className="buy-hero"><img src={sym(9)} alt="" /><img src={sym(9)} alt="" /><img src={sym(9)} alt="" /></div>
      <p className="lead">Board the Midnight Train now.</p>
      <p>The next spin is guaranteed to land at least 3 Scatters and start the free spins. Price: {g.buyPriceBets}x your bet of {money(bet)}.</p>
      <p className="fine">Theoretical return {g.rtp.toFixed(1)}%. The price is charged once and cannot be refunded after confirming.</p>
    </Dialog>
  );
}

function BetPicker(): ReactElement {
  const op = useStore((s) => s.operator)!;
  const bet = useStore((s) => s.bet);
  return (
    <Dialog title="Choose your bet">
      <div className="chips bets">
        {op.bets.map((b) => (
          <button type="button" key={b} className={b === bet ? 'on' : ''} aria-pressed={b === bet} onClick={() => { game().setBet(b); close(); }}>{money(b)}</button>
        ))}
      </div>
    </Dialog>
  );
}

function Reality(): ReactElement {
  const stats = useStore((s) => s.stats)!;
  const net = stats.won - stats.wagered;
  return (
    <Dialog
      title="Reality check" onClose={null}
      footer={<>
        <button type="button" className="btn ghost" onClick={() => { game().acknowledgeReality(); void game().openHistory(); }}>View history</button>
        <button type="button" className="btn primary" onClick={() => game().acknowledgeReality()}>Continue playing</button>
      </>}
    >
      <p className="lead">You have been playing for {duration(Date.now() - stats.startedAt)}.</p>
      <div className="stat-grid">
        <div><span>Wagered</span><b>{money(stats.wagered)}</b></div>
        <div><span>Won</span><b>{money(stats.won)}</b></div>
        <div><span>Net</span><b className={net >= 0 ? 'pos' : 'neg'}>{net > 0 ? '+' : ''}{money(net)}</b></div>
      </div>
      <p>Take a break whenever you like. You can close the game at any time.</p>
    </Dialog>
  );
}

function ErrorDialog(): ReactElement | null {
  const error = useStore((s) => s.error);
  if (!error) return null;
  const dismiss = (): void => store.set({ error: null });
  return (
    <Dialog
      title={error.title} onClose={error.fatal ? null : dismiss}
      footer={error.fatal
        ? <button type="button" className="btn primary" onClick={() => window.location.reload()}>Reload</button>
        : <>
          {game().isDemoWallet && error.title === 'Not enough balance' && <button type="button" className="btn ghost" onClick={() => void game().resetDemoBalance()}>Reset demo balance</button>}
          <button type="button" className="btn primary" onClick={dismiss}>OK</button>
        </>}
    >
      <p>{error.text}</p>
    </Dialog>
  );
}

export function Modals(): ReactElement {
  const modal = useStore((s) => s.modal);
  const error = useStore((s) => s.error);
  if (error) return <ErrorDialog />;
  switch (modal) {
    case 'menu': return <Menu />;
    case 'paytable': return <Paytable />;
    case 'history': return <History />;
    case 'settings': return <Settings />;
    case 'autoplay': return <Autoplay />;
    case 'buy': return <Buy />;
    case 'bet': return <BetPicker />;
    case 'reality': return <Reality />;
    default: return <></>;
  }
}
