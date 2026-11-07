import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { credits, useUI } from './context';

/** Rolling number that tweens between values without re-rendering React. */
export function Rolling({ value, className }: { value: number; className?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const cur = useRef({ v: value });
  useEffect(() => {
    const obj = cur.current;
    const tw = gsap.to(obj, {
      v: value,
      duration: Math.abs(value - obj.v) > 0 ? 0.6 : 0,
      ease: 'power2.out',
      onUpdate: () => {
        if (el.current) el.current.textContent = credits(obj.v);
      },
    });
    return () => void tw.kill();
  }, [value]);
  return (
    <span ref={el} className={className}>
      {credits(value)}
    </span>
  );
}

export function BalanceDisplay() {
  const balance = useUI((s) => s.balance);
  const win = useUI((s) => s.spinWin);
  const last = useUI((s) => s.lastWin);
  const state = useUI((s) => s.gameState);
  const showing = state === 'READY' ? last : win;
  return (
    <div className="readouts">
      <div className="readout">
        <span className="label">Demo credits</span>
        <Rolling value={balance} className="value" />
      </div>
      <div className={`readout win ${showing > 0 ? 'lit' : ''}`}>
        <span className="label">{state === 'READY' ? 'Last win' : 'Win'}</span>
        <Rolling value={showing} className="value" />
      </div>
    </div>
  );
}
