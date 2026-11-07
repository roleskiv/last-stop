import { useEffect, useState } from 'react';
import { SYMBOLS } from '../config/symbols';
import { CREDIT_SCALE } from '../config/gameConfig';
import { useGame, useUI } from '../components/context';
import { SeededRNG } from '../engine/RNG';
import { formatReport, simulate } from '../sim/Simulator';
import { SCENARIOS } from './scenarios';

/**
 * Developer panel. This module is only imported when import.meta.env.DEV is
 * true, so it is excluded from production builds.
 */
export default function DevPanel() {
  const game = useGame();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'force' | 'state' | 'log' | 'sim' | 'win'>('force');
  const [sim, setSim] = useState('');
  const [seed, setSeed] = useState('');
  const [, tick] = useState(0);
  const state = useUI((s) => s.gameState);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [open]);
  const o = game.lastOutcome;
  const counts = new Map<number, number>();
  const end = o?.base.events[o.base.events.length - 1];
  if (end && end.t === 'end') for (const c of end.grid) counts.set(c.sym, (counts.get(c.sym) ?? 0) + 1);

  return (
    <div className={`dev-panel ${open ? 'open' : ''}`}>
      <button className="dev-toggle" onClick={() => setOpen(!open)}>
        DEV
      </button>
      {open && (
        <div className="dev-body">
          <div className="dev-tabs">
            {(['force', 'state', 'log', 'win', 'sim'] as const).map((t) => (
              <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          {tab === 'force' && (
            <div className="dev-grid">
              {Object.entries(SCENARIOS).map(([k, s]) => (
                <button
                  key={k}
                  disabled={state !== 'READY'}
                  onClick={() => {
                    game.forceNext(s.outcome);
                    void game.spin();
                  }}
                >
                  {s.label}
                </button>
              ))}
              <div className="dev-row">
                <input placeholder="seed (blank = crypto)" value={seed} onChange={(e) => setSeed(e.target.value)} />
                <button onClick={() => game.useSeed(seed || null)}>Use RNG</button>
              </div>
            </div>
          )}
          {tab === 'state' && (
            <pre>
              {`state: ${state}
rng: ${game.engine.rngKind}
balance: ${(game.engine.balance / CREDIT_SCALE).toFixed(2)}
bet: ${game.engine.bet / CREDIT_SCALE}
pending: ${game.engine.hasPending}
fps: ${game.renderer.fps.toFixed(0)}
particles: ${game.renderer.particles.count}
history: ${game.fsm.history.slice(-12).join(' > ')}

final grid symbol counts:
${[...counts.entries()].map(([s, n]) => `  ${SYMBOLS[s as 0].name}: ${n}`).join('\n')}`}
            </pre>
          )}
          {tab === 'log' && (
            <pre>
              {game.log.slice(-30).join('\n')}
              {'\n\nlast round events:\n'}
              {o?.base.events.map((e) => e.t + (e.t === 'win' ? ` +${e.stepWin / CREDIT_SCALE}` : e.t === 'upgrade' ? ` ${SYMBOLS[e.from].key}->${SYMBOLS[e.to].key}@${e.pos}` : e.t === 'punch' ? ` ${e.from}->${e.target}` : e.t === 'platform' ? ` @${e.pos}` : '')).join('\n')}
            </pre>
          )}
          {tab === 'win' && (
            <pre>
              {o
                ? [o.base, ...(o.bonus?.rounds ?? [])]
                    .flatMap((r, ri) =>
                      r.events.flatMap((e) =>
                        e.t === 'win'
                          ? e.clusters.map((c) => `${ri ? `FS${ri}` : 'base'}  ${SYMBOLS[c.sym].name} x${c.size} = ${(c.payout / CREDIT_SCALE).toFixed(2)}`)
                          : [],
                      ),
                    )
                    .join('\n') + `\n\ntotal: ${(o.totalWin / CREDIT_SCALE).toFixed(2)}`
                : 'no spin yet'}
            </pre>
          )}
          {tab === 'sim' && (
            <div>
              <div className="dev-row">
                {[10000, 100000].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setSim('running...');
                      setTimeout(() => setSim(formatReport(simulate(n, new SeededRNG(Date.now())))), 30);
                    }}
                  >
                    Simulate {n.toLocaleString()}
                  </button>
                ))}
              </div>
              <pre>{sim || 'Run 1,000,000+ rounds headless with: npm run simulate'}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
