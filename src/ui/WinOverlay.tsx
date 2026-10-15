import type { ReactNode } from 'react';
import { starsFor } from '../sim/play';

type Props = {
  mistakes: number;
  assist: boolean;
  hasNext: boolean;
  onReplay: () => void;
  onNext: () => void;
  onLevels: () => void;
  children: ReactNode;
};

export function WinOverlay({
  mistakes,
  assist,
  hasNext,
  onReplay,
  onNext,
  onLevels,
  children,
}: Props) {
  const stars = starsFor(mistakes, assist);
  return (
    <div className="win-overlay" role="dialog" aria-modal="true">
      <div className="win-overlay__card">
        <div className="win-overlay__model">{children}</div>
        <div className="win-overlay__stars" aria-label={`${stars} stars`}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= stars ? 'star star--on' : 'star'}>★</span>
          ))}
        </div>
        <p className="win-overlay__mistakes">
          {mistakes === 0 ? 'Perfect — no mistakes!' : `${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
        </p>
        <div className="win-overlay__actions">
          <button type="button" className="btn btn--secondary" onClick={onReplay}>Replay</button>
          {hasNext && (
            <button type="button" className="btn btn--primary" onClick={onNext}>Next level</button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onLevels}>Levels</button>
        </div>
      </div>
    </div>
  );
}
