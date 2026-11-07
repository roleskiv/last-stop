import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useGame } from './context';
import { CloseIcon } from './icons';

export function Modal({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  const game = useGame();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && game.openModal(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game]);
  return (
    <div className="modal-backdrop" onClick={() => game.openModal(null)}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={() => game.openModal(null)}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
