import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { CompiledLevel } from '../sim/types';
import { canFold, applyFold, initialState, isWin, starsFor } from '../sim/play';
import type { GameState } from '../sim/types';
import type { Line } from '../geometry/line';
import { loadStorage, recordWin, saveStorage, type StoredData } from '../storage';

export type Screen = 'levels' | 'game' | 'settings';

type AnimationState = {
  foldIndex: number;
  progress: number;
  line: Line;
  moving: number[];
  direction: 'valley' | 'mountain';
};

type AppState = {
  screen: Screen;
  levelId: string | null;
  game: GameState | null;
  level: CompiledLevel | null;
  storage: StoredData;
  animation: AnimationState | null;
  rejectSegmentId: number | null;
  shakeUntil: number;
  pressedSegmentId: number | null;
  winReplay: boolean;
  showWin: boolean;
};

type Action =
  | { type: 'OPEN_LEVELS' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'START_LEVEL'; level: CompiledLevel }
  | { type: 'BACK' }
  | { type: 'RESTART' }
  | { type: 'SET_STORAGE'; storage: StoredData }
  | { type: 'PRESS_SEGMENT'; id: number | null }
  | { type: 'REJECT'; segmentId: number }
  | { type: 'START_ANIMATION'; foldIndex: number; line: Line; moving: number[]; direction: 'valley' | 'mountain' }
  | { type: 'ANIMATION_TICK'; progress: number }
  | { type: 'FINISH_ANIMATION'; next: GameState }
  | { type: 'WIN' }
  | { type: 'DISMISS_WIN' }
  | { type: 'START_WIN_REPLAY' }
  | { type: 'WIN_REPLAY_STEP'; foldIndex: number }
  | { type: 'END_WIN_REPLAY' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'OPEN_LEVELS':
      return { ...state, screen: 'levels', levelId: null, game: null, level: null, animation: null, showWin: false };
    case 'OPEN_SETTINGS':
      return { ...state, screen: 'settings' };
    case 'START_LEVEL':
      return {
        ...state,
        screen: 'game',
        levelId: action.level.def.id,
        level: action.level,
        game: initialState(action.level),
        animation: null,
        rejectSegmentId: null,
        showWin: false,
        winReplay: false,
      };
    case 'BACK':
      return { ...state, screen: 'levels', animation: null, showWin: false };
    case 'RESTART':
      if (!state.level) return state;
      return {
        ...state,
        game: initialState(state.level),
        animation: null,
        rejectSegmentId: null,
        showWin: false,
        winReplay: false,
      };
    case 'SET_STORAGE':
      return { ...state, storage: action.storage };
    case 'PRESS_SEGMENT':
      return { ...state, pressedSegmentId: action.id };
    case 'REJECT':
      if (action.segmentId < 0) {
        return { ...state, rejectSegmentId: null };
      }
      return {
        ...state,
        game: state.game ? { ...state.game, mistakes: state.game.mistakes + 1 } : null,
        rejectSegmentId: action.segmentId,
        shakeUntil: Date.now() + 200,
      };
    case 'START_ANIMATION':
      return {
        ...state,
        animation: {
          foldIndex: action.foldIndex,
          progress: 0,
          line: action.line,
          moving: action.moving,
          direction: action.direction,
        },
      };
    case 'ANIMATION_TICK':
      if (!state.animation) return state;
      return { ...state, animation: { ...state.animation, progress: action.progress } };
    case 'FINISH_ANIMATION': {
      const next = action.next;
      const level = state.level;
      const won = level && isWin(next, level);
      let storage = state.storage;
      if (won && level) {
        const stars = starsFor(next.mistakes, storage.settings.assist);
        storage = recordWin(storage, level.def.id, stars);
        saveStorage(storage);
      }
      return {
        ...state,
        game: next,
        animation: null,
        storage,
        showWin: !!won,
      };
    }
    case 'WIN':
      return { ...state, showWin: true };
    case 'DISMISS_WIN':
      return { ...state, showWin: false };
    case 'START_WIN_REPLAY':
      if (!state.level) return state;
      return {
        ...state,
        winReplay: true,
        game: initialState(state.level),
        showWin: false,
        animation: null,
      };
    case 'WIN_REPLAY_STEP':
      return state;
    case 'END_WIN_REPLAY':
      return { ...state, winReplay: false, showWin: true };
    default:
      return state;
  }
}

const initialAppState: AppState = {
  screen: 'levels',
  levelId: null,
  game: null,
  level: null,
  storage: loadStorage(),
  animation: null,
  rejectSegmentId: null,
  shakeUntil: 0,
  pressedSegmentId: null,
  winReplay: false,
  showWin: false,
};

type GameContextValue = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  tapFold: (foldIndex: number, segmentId: number) => void;
  dismissTutorial: () => void;
  updateSettings: (partial: Partial<StoredData['settings']>) => void;
  resetProgress: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialAppState);

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const tapFold = useCallback(
    (foldIndex: number, segmentId: number) => {
      if (state.animation || !state.level || !state.game) return;
      if (state.game.doneOrder.includes(foldIndex)) return;

      const check = canFold(state.level, state.game, foldIndex);
      if (!check.ok) {
        dispatch({ type: 'REJECT', segmentId });
        if (state.storage.settings.haptics) {
          navigator.vibrate?.(40);
        }
        window.setTimeout(() => dispatch({ type: 'REJECT', segmentId: -1 }), 300);
        return;
      }

      if (reducedMotion) {
        const next = applyFold(state.level, state.game, foldIndex, check);
        dispatch({ type: 'FINISH_ANIMATION', next });
        return;
      }

      dispatch({
        type: 'START_ANIMATION',
        foldIndex,
        line: check.line,
        moving: check.moving,
        direction: check.direction,
      });
    },
    [state.animation, state.level, state.game, state.storage.settings.haptics, reducedMotion],
  );

  useEffect(() => {
    if (!state.animation || !state.level || !state.game) return;
    const duration = reducedMotion ? 150 : 500;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      dispatch({ type: 'ANIMATION_TICK', progress: t });
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        const check = canFold(state.level!, state.game!, state.animation!.foldIndex);
        if (check.ok) {
          const next = applyFold(state.level!, state.game!, state.animation!.foldIndex, check);
          dispatch({ type: 'FINISH_ANIMATION', next });
        }
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state.animation?.foldIndex, state.level, state.game, reducedMotion]);

  useEffect(() => {
    if (!state.winReplay || !state.level || !state.game) return;
    const order = state.game.doneOrder;
    const total = state.level.def.folds.length;
    if (order.length >= total) {
      dispatch({ type: 'END_WIN_REPLAY' });
      return;
    }
    const nextFold = state.level.folds.findIndex((_, i) => !order.includes(i));
    const timer = window.setTimeout(() => {
      const check = canFold(state.level!, state.game!, nextFold);
      if (check.ok) {
        const next = applyFold(state.level!, state.game!, nextFold, check);
        dispatch({ type: 'FINISH_ANIMATION', next });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [state.winReplay, state.game?.doneOrder.length, state.level]);

  const dismissTutorial = useCallback(() => {
    if (!state.levelId) return;
    const storage = {
      ...state.storage,
      dismissedTutorials: { ...state.storage.dismissedTutorials, [state.levelId]: true },
    };
    saveStorage(storage);
    dispatch({ type: 'SET_STORAGE', storage });
  }, [state.levelId, state.storage]);

  const updateSettings = useCallback(
    (partial: Partial<StoredData['settings']>) => {
      const storage = { ...state.storage, settings: { ...state.storage.settings, ...partial } };
      saveStorage(storage);
      dispatch({ type: 'SET_STORAGE', storage });
    },
    [state.storage],
  );

  const resetProgress = useCallback(() => {
    const storage = { ...state.storage, progress: {}, dismissedTutorials: {} };
    saveStorage(storage);
    dispatch({ type: 'SET_STORAGE', storage });
  }, [state.storage]);

  const value = useMemo(
    () => ({ state, dispatch, tapFold, dismissTutorial, updateSettings, resetProgress }),
    [state, tapFold, dismissTutorial, updateSettings, resetProgress],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame outside provider');
  return ctx;
}
