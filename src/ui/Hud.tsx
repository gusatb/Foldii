type Props = {
  title: string;
  mistakes: number;
  onBack: () => void;
  onRestart: () => void;
};

export function Hud({ title, mistakes, onBack, onRestart }: Props) {
  return (
    <header className="hud">
      <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <h1 className="hud__title">{title}</h1>
      <div className="hud__mistakes" aria-label={`${mistakes} mistakes`}>
        {Array.from({ length: Math.min(mistakes, 5) }).map((_, i) => (
          <span key={i} className="hud__mistake-dot" />
        ))}
        {mistakes > 5 && <span className="hud__mistake-more">+{mistakes - 5}</span>}
      </div>
      <button type="button" className="icon-btn" onClick={onRestart} aria-label="Restart">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-7.5M19 5A9 9 0 005 12.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </button>
    </header>
  );
}
