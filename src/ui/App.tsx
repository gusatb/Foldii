import { getCompiledLevel, levelDefs } from '../levels';
import { isLevelUnlocked } from '../storage';
import { GameProvider, useGame } from './gameContext';
import { GameScreen } from './Game';
import { LevelSelect } from './LevelSelect';
import { Settings } from './Settings';

function AppRoutes() {
  const { state, dispatch, updateSettings, resetProgress } = useGame();
  const ids = levelDefs.map((l) => l.id);

  if (state.screen === 'settings') {
    return (
      <Settings
        haptics={state.storage.settings.haptics}
        assist={state.storage.settings.assist}
        onHaptics={(v) => updateSettings({ haptics: v })}
        onAssist={(v) => updateSettings({ assist: v })}
        onReset={resetProgress}
        onClose={() => dispatch({ type: 'OPEN_LEVELS' })}
      />
    );
  }

  if (state.screen === 'game') {
    return <GameScreen />;
  }

  return (
    <LevelSelect
      progress={state.storage.progress}
      unlocked={(i) => isLevelUnlocked(i, state.storage.progress, ids)}
      onSelect={(id) => dispatch({ type: 'START_LEVEL', level: getCompiledLevel(id) })}
      onSettings={() => dispatch({ type: 'OPEN_SETTINGS' })}
    />
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppRoutes />
    </GameProvider>
  );
}
