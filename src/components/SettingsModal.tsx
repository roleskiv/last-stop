import { useState } from 'react';
import { useGame, useUI } from './context';
import { Modal } from './Modal';
import { SoundIcon } from './icons';

export function SettingsModal() {
  const game = useGame();
  const [a, setA] = useState(game.audio.getSettings());
  const turbo = useUI((s) => s.turbo);
  const reduced = useUI((s) => s.reducedMotion);
  const busy = useUI((s) => s.gameState !== 'READY');
  const update = (patch: Partial<typeof a>) => {
    const next = { ...a, ...patch };
    setA(next);
    game.audio.update(next);
  };
  return (
    <Modal title="Settings">
      <div className="settings">
        <div className="setting-row">
          <span>Sound</span>
          <button className={`toggle ${!a.muted ? 'on' : ''}`} onClick={() => update({ muted: !a.muted })} aria-pressed={!a.muted}>
            <SoundIcon muted={a.muted} /> {a.muted ? 'Muted' : 'On'}
          </button>
        </div>
        <Slider label="Master volume" value={a.master} onChange={(v) => update({ master: v })} />
        <Slider label="Music" value={a.music} onChange={(v) => update({ music: v })} />
        <Slider label="Effects" value={a.sfx} onChange={(v) => update({ sfx: v })} />
        <div className="setting-row">
          <span>Turbo animations</span>
          <button className={`toggle ${turbo ? 'on' : ''}`} onClick={() => game.setTurbo(!turbo)} aria-pressed={turbo}>
            {turbo ? 'On' : 'Off'}
          </button>
        </div>
        <div className="setting-row">
          <span>Reduced motion</span>
          <button className={`toggle ${reduced ? 'on' : ''}`} onClick={() => game.setReducedMotion(!reduced)} aria-pressed={reduced}>
            {reduced ? 'On' : 'Off'}
          </button>
        </div>
        <div className="setting-row">
          <span>Demo balance</span>
          <button className="toggle" disabled={busy} onClick={() => game.resetBalance()}>
            Reset to 10,000
          </button>
        </div>
        <p className="muted small">Fictional credits only. No real money, purchases, deposits or withdrawals.</p>
      </div>
    </Modal>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
