import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import './styles.css';
import { createRoot } from 'react-dom/client';
import { getOperator } from '../shared/operator.ts';
import type { GameClient } from '../shared/protocol.ts';
import { audio } from './audio/audio.ts';
import { Controller } from './core/controller.ts';
import { store } from './core/store.ts';
import { setGame } from './game.ts';
import { LocalClient } from './net/localClient.ts';
import { RemoteClient } from './net/remoteClient.ts';
import { BASE, loadTextures } from './stage/assets.ts';
import { Stage } from './stage/stage.ts';
import { App } from './ui/App.tsx';

/**
 * Launch parameters:
 *   ?rgs=<url>&token=<launch token>   play against a game server (real integration)
 *   ?profile=demo|eu|uk               offline demo with that operator profile
 *   ?seed=<text>                      offline demo only: repeatable results for QA
 */
const params = new URLSearchParams(window.location.search);
const rgs = params.get('rgs');
const client: GameClient = rgs
  ? new RemoteClient(rgs, params.get('token') ?? '')
  : new LocalClient(getOperator(params.get('profile')), params.get('seed') ?? undefined);

const stage = new Stage();
const controller = new Controller(stage, client);
setGame(controller);

let pending: Awaited<ReturnType<Controller['open']>> = null;

function start(): void {
  if (!store.get().needsStart) return;
  store.set({ needsStart: false });
  void audio.unlock().then(() => audio.playMusic('base'));
  void stage.graves.present();
  if (pending) {
    const round = pending;
    pending = null;
    void controller.resume(round);
  }
}

createRoot(document.getElementById('ui')!).render(<App onStart={start} />);

async function boot(): Promise<void> {
  const progress = { tex: 0, audio: 0, session: 0 };
  const report = (): void => store.set({ loadProgress: progress.tex * 0.6 + progress.audio * 0.3 + progress.session * 0.1 });
  try {
    await stage.init(document.getElementById('stage')!);
    const session = controller.open().then((p) => { pending = p; progress.session = 1; report(); });
    await Promise.all([
      loadTextures((d, t) => { progress.tex = d / t; report(); }),
      audio.preload(BASE, (d, t) => { progress.audio = d / t; report(); }),
      document.fonts.load('40px "Bebas Neue"').catch(() => undefined),
      session,
    ]);
  } catch (err) {
    console.error(err);
    controller.fail(err);
    store.set({ error: { ...store.get().error!, fatal: true } });
    return;
  }
  stage.onLayout = (layout) => store.set({ layout });
  stage.build();
  controller.showAttract();
  store.set({ phase: 'idle', loadProgress: 1 });
}

void boot();

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (e.code === 'Space' || e.code === 'Enter') {
    if (tag === 'BUTTON' || tag === 'INPUT') return;
    e.preventDefault();
    if (store.get().needsStart) { if (store.get().phase !== 'loading') start(); return; }
    controller.primary();
  }
});
document.getElementById('stage')!.addEventListener('pointerdown', () => {
  const s = store.get();
  if (s.needsStart || s.modal || s.error) return;
  stage.tap();
  if (s.phase === 'spinning' && s.canSkip) controller.primary();
});
document.addEventListener('visibilitychange', () => (document.hidden ? audio.suspend() : audio.resume()));
