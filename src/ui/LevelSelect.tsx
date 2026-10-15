import { allCompiledLevels, levelDefs } from '../levels';
import type { ProgressEntry } from '../storage';
import { toView, polyToPath } from './viewTransform';

type Props = {
  progress: Record<string, ProgressEntry>;
  unlocked: (index: number) => boolean;
  onSelect: (levelId: string) => void;
  onSettings: () => void;
};

function Thumbnail({ levelId }: { levelId: string }) {
  const level = allCompiledLevels().find((l) => l.def.id === levelId)!;
  const rot = level.def.viewRotationDeg;
  const paths = level.segments.map((seg) => {
    const a = toView(seg.a, rot);
    const b = toView(seg.b, rot);
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  });
  const paper = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ].map((p) => toView(p, rot));
  return (
    <svg viewBox="-0.1 -0.1 1.2 1.2" className="level-card__thumb">
      <path d={polyToPath(paper)} className="level-card__paper" />
      {paths.map((d, i) => (
        <path key={i} d={d} className="level-card__crease" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function LevelSelect({ progress, unlocked, onSelect, onSettings }: Props) {
  return (
    <div className="level-select">
      <header className="level-select__header">
        <h1 className="app-title">Foldii</h1>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>
      </header>
      <div className="level-grid">
        {levelDefs.map((def, index) => {
          const open = unlocked(index);
          const stars = progress[def.id]?.bestStars ?? 0;
          return (
            <button
              key={def.id}
              type="button"
              className={`level-card ${open ? '' : 'level-card--locked'}`}
              disabled={!open}
              onClick={() => onSelect(def.id)}
            >
              <Thumbnail levelId={def.id} />
              <span className="level-card__name">{def.name}</span>
              <span className="level-card__stars" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                  <span key={i} className={i <= stars ? 'star star--on star--sm' : 'star star--sm'}>★</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
