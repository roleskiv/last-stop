import { useUI } from './context';

export function LoadingScreen() {
  const state = useUI((s) => s.gameState);
  const p = useUI((s) => s.loadingProgress);
  const msg = useUI((s) => s.message);
  if (state !== 'LOADING' && state !== 'ERROR') return null;
  if (state === 'ERROR' && !msg) return null;
  return (
    <div className="loading">
      <div className="loading-logo">LAST STOP</div>
      <div className="loading-sub">MIDNIGHT LINE</div>
      <div className="loading-bar">
        <div style={{ width: `${Math.round(p * 100)}%` }} />
      </div>
      <div className="loading-tag">{state === 'ERROR' ? msg : 'Mind the gap… it might bite back.'}</div>
      <div className="loading-legal">Free-to-play demo. Fictional credits only — no real money.</div>
    </div>
  );
}
