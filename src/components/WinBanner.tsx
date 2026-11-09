import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { credits, useGame, useUI } from './context';

const TITLES: Record<string, { title: string; sub: string; seconds: number }> = {
  medium: { title: 'NICE RIDE', sub: '', seconds: 0.8 },
  big: { title: 'BIG WIN', sub: 'All aboard!', seconds: 2.6 },
  mega: { title: 'MEGA WIN', sub: 'The conductor approves', seconds: 3.8 },
  legendary: { title: 'END OF THE LINE', sub: 'Legendary win', seconds: 5.2 },
};

/**
 * Tiered win presentation. Medium wins get a brief station-sign plate; big and
 * above get a full-screen title with a rolling counter. Click / tap or Space
 * jumps to the final amount, a second tap closes.
 */
export function WinBanner() {
  const game = useGame();
  const banner = useUI((s) => s.banner);
  const turbo = useUI((s) => s.turbo);
  const num = useRef<HTMLSpanElement>(null);
  const tween = useRef<gsap.core.Tween | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!banner) return;
    done.current = false;
    const cfg = TITLES[banner.tier] ?? TITLES.big;
    const obj = { v: 0 };
    const seconds = cfg.seconds * (turbo ? 0.5 : 1);
    tween.current = gsap.to(obj, {
      v: banner.amount,
      duration: seconds,
      ease: 'power1.out',
      onUpdate: () => {
        if (num.current) num.current.textContent = credits(obj.v);
      },
      onComplete: () => {
        done.current = true;
        if (banner.tier !== 'medium') auto = window.setTimeout(() => game.bannerDone(), 1600);
      },
    });
    let auto = 0;
    return () => {
      tween.current?.kill();
      window.clearTimeout(auto);
    };
  }, [banner, game, turbo]);

  if (!banner) return null;
  const cfg = TITLES[banner.tier] ?? TITLES.big;
  const onClick = () => {
    if (banner.tier === 'medium') return;
    if (!done.current) {
      tween.current?.progress(1);
    } else game.bannerDone();
  };

  if (banner.tier === 'medium')
    return (
      <div className="medium-win" key={banner.key}>
        <div className="station-plate">
          <span className="plate-title">{cfg.title}</span>
          <span className="plate-amount" ref={num}>{credits(0)}</span>
        </div>
      </div>
    );

  return (
    <div className={`big-win tier-${banner.tier}`} key={banner.key} onClick={onClick} role="dialog" aria-label={cfg.title}>
      <div className="big-win-rays" />
      <div className="big-win-card">
        <div className="big-win-title" data-text={cfg.title}>{cfg.title}</div>
        <div className="big-win-sub">{cfg.sub}</div>
        <div className="big-win-amount">
          <span ref={num}>{credits(0)}</span>
          <small>demo credits</small>
        </div>
        <div className="tap-hint">Tap to continue</div>
      </div>
    </div>
  );
}
