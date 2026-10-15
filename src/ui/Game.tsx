import { getCompiledLevel, levelDefs } from '../levels';
import { useGame } from './gameContext';
import { Hud } from './Hud';
import { ModelView } from './ModelView';
import { SheetView } from './SheetView';
import { WinOverlay } from './WinOverlay';

export function GameScreen() {
  const { state, dispatch, tapFold, dismissTutorial } = useGame();
  const level = state.level;
  const game = state.game;
  if (!level || !game) return null;

  const def = level.def;
  const showTutorial =
    def.tutorial &&
    !state.storage.dismissedTutorials[def.id] &&
    !state.storage.progress[def.id]?.completed;

  const levelIndex = levelDefs.findIndex((l) => l.id === def.id);
  const hasNext = levelIndex >= 0 && levelIndex < levelDefs.length - 1;

  return (
    <div className="game">
      <Hud
        title={def.name}
        mistakes={game.mistakes}
        onBack={() => dispatch({ type: 'BACK' })}
        onRestart={() => dispatch({ type: 'RESTART' })}
      />
      {showTutorial && (
        <div className="tutorial-banner">
          <p>{def.tutorial}</p>
          <button type="button" onClick={dismissTutorial} aria-label="Dismiss">×</button>
        </div>
      )}
      <div className="game__main">
        <div className="game__sheet-wrap">
          <SheetView
            level={level}
            game={game}
            rotationDeg={def.viewRotationDeg}
            assist={state.storage.settings.assist}
            pressedSegmentId={state.pressedSegmentId}
            rejectSegmentId={state.rejectSegmentId}
            shakeUntil={state.shakeUntil}
            onPress={(id) => dispatch({ type: 'PRESS_SEGMENT', id })}
            onTapFold={tapFold}
          />
        </div>
        <div className="game__model-wrap">
          <ModelView
            level={level}
            game={game}
            rotationDeg={def.viewRotationDeg}
            animation={state.animation}
          />
          <p className="game__progress">
            {game.doneOrder.length} / {level.folds.length} folds
          </p>
        </div>
      </div>
      {state.showWin && (
        <WinOverlay
          mistakes={game.mistakes}
          assist={state.storage.settings.assist}
          hasNext={hasNext}
          onReplay={() => dispatch({ type: 'START_WIN_REPLAY' })}
          onNext={() => {
            const nextId = levelDefs[levelIndex + 1]?.id;
            if (nextId) {
              dispatch({ type: 'START_LEVEL', level: getCompiledLevel(nextId) });
            }
          }}
          onLevels={() => dispatch({ type: 'OPEN_LEVELS' })}
        >
          <ModelView
            level={level}
            game={game}
            rotationDeg={def.viewRotationDeg}
            animation={null}
          />
        </WinOverlay>
      )}
    </div>
  );
}
