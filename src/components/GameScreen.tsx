import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { GameController } from '../state/GameController';
import { GameContext, useUI } from './context';
import { Hud } from './Hud';
import { WinBanner } from './WinBanner';
import { BonusIntroOverlay, BonusOutroOverlay, FreeSpinsBar } from './BonusOverlay';
import { PaytableModal } from './PaytableModal';
import { SettingsModal } from './SettingsModal';
import { AutoplayMenu } from './AutoplayMenu';
import { LoadingScreen } from './LoadingScreen';

// The developer panel is only bundled in development builds.
const DevPanel = import.meta.env.DEV ? lazy(() => import('../dev/DevPanel')) : null;

export function GameScreen() {
  const [game] = useState(() => new GameController());
  const host = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    if (import.meta.env.DEV) (window as unknown as { __game: GameController }).__game = game;
    let alive = true;
    void game.init(host.current).then(() => {
      if (!alive) return;
      const measure = () => hud.current && game.renderer.setHudHeight(hud.current.getBoundingClientRect().height);
      measure();
      const ro = new ResizeObserver(measure);
      if (hud.current) ro.observe(hud.current);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !game.store.get().modal) {
        e.preventDefault();
        if (game.store.get().canSkip) game.skip();
        else void game.spin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      alive = false;
      window.removeEventListener('keydown', onKey);
    };
  }, [game]);

  return (
    <GameContext.Provider value={game}>
      <div className="game-root" onPointerDown={() => game.unlockAudio()}>
        <div className="stage" ref={host} />
        <Overlays />
        <div className="hud-wrap" ref={hud}>
          <FreeSpinsBar />
          <Hud />
        </div>
        <Modals />
        <LoadingScreen />
        {DevPanel && (
          <Suspense fallback={null}>
            <DevPanel />
          </Suspense>
        )}
      </div>
    </GameContext.Provider>
  );
}

function Overlays() {
  return (
    <>
      <WinBanner />
      <BonusIntroOverlay />
      <BonusOutroOverlay />
      <Message />
    </>
  );
}

function Message() {
  const msg = useUI((s) => s.message);
  if (!msg) return null;
  return <div className="toast" role="status">{msg}</div>;
}

function Modals() {
  const modal = useUI((s) => s.modal);
  if (modal === 'paytable') return <PaytableModal />;
  if (modal === 'settings') return <SettingsModal />;
  if (modal === 'autoplay') return <AutoplayMenu />;
  return null;
}
