import { useState } from 'react';
import { symbolAssets } from '../assets/assetManifest';
import { featureConfig } from '../config/featureConfig';
import { gameConfig } from '../config/gameConfig';
import { clusterPay } from '../config/paytable';
import { REGULAR_SYMBOLS, Sym, SYMBOLS } from '../config/symbols';
import { credits, useUI } from './context';
import { Modal } from './Modal';

const SIZES = [5, 6, 8, 10, 12, 15, 20];
const TABS = ['Paytable', 'Features', 'Rules'] as const;

export function PaytableModal() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Paytable');
  const bet = useUI((s) => s.bet);
  return (
    <Modal title="Station Guide" wide>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Paytable' && (
        <>
          <p className="muted">
            Cluster pays at your current bet of <b>{credits(bet)}</b> demo credits. Clusters of {SIZES[SIZES.length - 1]}+ pay the top value.
          </p>
          <div className="pay-grid">
            {[...REGULAR_SYMBOLS].reverse().map((s) => (
              <div className={`pay-card ${SYMBOLS[s].tier}`} key={s}>
                <img src={symbolAssets[s]} alt="" />
                <div className="pay-name">{SYMBOLS[s].name}</div>
                <table>
                  <tbody>
                    {SIZES.map((n) => (
                      <tr key={n}>
                        <td>{n === 20 ? '20+' : n}</td>
                        <td>{credits(Math.round(clusterPay(s, n) * bet))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === 'Features' && (
        <div className="features">
          <Feature sym={Sym.WILD} title="Conductor Graves Wild">
            Substitutes for every regular symbol. A Wild can belong to clusters of different symbols at the same time, and each cluster pays.
          </Feature>
          <Feature sym={Sym.SIGN} title="Phantom Platforms">
            A Haunted Platform Sign haunts its tile, then turns into a regular symbol. Whenever a regular symbol lands on a haunted tile (from the sign, a cascade, or a new free spin) it may upgrade to a higher symbol or a Wild before wins are counted. Each tile activates once per cascade step. Haunted tiles last for the whole spin (up to {featureConfig.phantomPlatforms.baseCap} at once) and for the whole Midnight Train ride (up to {featureConfig.phantomPlatforms.freeSpinsCap}).
          </Feature>
          <Feature sym={Sym.PUNCH} title="Ticket Punch">
            Before wins are counted, each Ticket Punch punches one regular symbol into a Wild, favouring spots next to matching symbols, then turns into a regular symbol itself. Punches never appear in cascades, so they can never chain.
          </Feature>
          <Feature sym={Sym.SCATTER} title="Midnight Train">
            3 trains on a spin trigger {featureConfig.midnightTrain.awards[3]} free spins, 4 trigger {featureConfig.midnightTrain.awards[4]}, and 5+ trigger {featureConfig.midnightTrain.awards[5]}. During the ride, Platform Signs and Ticket Punches appear more often, haunted tiles persist between spins, and 3 trains award +{featureConfig.midnightTrain.retriggerSpins} spins. Free spins use the triggering bet.
          </Feature>
        </div>
      )}
      {tab === 'Rules' && (
        <div className="rules">
          <h3>Cluster wins</h3>
          <p>{gameConfig.minClusterSize} or more matching regular symbols connected horizontally or vertically form a cluster. Diagonals do not connect. Every separate cluster pays on its own.</p>
          <h3>Cascades</h3>
          <p>Winning symbols vanish, symbols above fall into the gaps and new ones drop in from the top. The grid is checked again and cascades continue until no new cluster forms.</p>
          <h3>Order of play</h3>
          <p>Each spin resolves in a fixed order: count trains, activate Platform Signs, resolve Ticket Punches, apply haunted-tile upgrades, then evaluate clusters and cascade.</p>
          <h3>Demo credits</h3>
          <p>
            LAST STOP is a free demo that uses fictional credits only. Credits have no cash value and cannot be bought, sold, deposited or withdrawn. You start with {gameConfig.startingBalance.toLocaleString()} credits and can reset them at any time in Settings. The bet is deducted when a spin starts and all wins from that spin, including the whole bonus, are credited once when it finishes. A single spin can win at most {gameConfig.maxWinMultiplier.toLocaleString()}x the bet.
          </p>
          <h3>Fairness</h3>
          <p>Outcomes come from the browser's cryptographic random number generator and a fixed, documented probability model. Results never depend on past results, bet changes or balance. The return-to-player of this prototype is a development estimate from simulation and has not been certified.</p>
          <p className="muted">Turbo and skipping only change animation speed, never the outcome.</p>
        </div>
      )}
    </Modal>
  );
}

function Feature({ sym, title, children }: { sym: number; title: string; children: React.ReactNode }) {
  return (
    <div className="feature">
      <img src={symbolAssets[sym as 0]} alt="" />
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}
