import { useState } from 'react';

type Props = {
  haptics: boolean;
  assist: boolean;
  onHaptics: (v: boolean) => void;
  onAssist: (v: boolean) => void;
  onReset: () => void;
  onClose: () => void;
};

export function Settings({ haptics, assist, onHaptics, onAssist, onReset, onClose }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="settings">
      <header className="settings__header">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <h2>Settings</h2>
      </header>
      <label className="settings__row">
        <span>Haptic feedback</span>
        <input type="checkbox" checked={haptics} onChange={(e) => onHaptics(e.target.checked)} />
      </label>
      <label className="settings__row">
        <span>Mountain / valley assist</span>
        <input type="checkbox" checked={assist} onChange={(e) => onAssist(e.target.checked)} />
      </label>
      <p className="settings__hint">Assist caps stars at 2.</p>
      {!confirmReset ? (
        <button type="button" className="btn btn--danger" onClick={() => setConfirmReset(true)}>
          Reset progress
        </button>
      ) : (
        <div className="settings__confirm">
          <p>Clear all stars and unlocks?</p>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              onReset();
              setConfirmReset(false);
            }}
          >
            Yes, reset
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
