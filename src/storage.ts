export interface ProgressEntry {
  bestStars: number;
  completed: boolean;
}

export interface Settings {
  haptics: boolean;
  assist: boolean;
}

export interface StoredData {
  progress: Record<string, ProgressEntry>;
  settings: Settings;
  dismissedTutorials: Record<string, boolean>;
}

const KEY = 'foldii-v1';

const defaultData: StoredData = {
  progress: {},
  settings: { haptics: true, assist: false },
  dismissedTutorials: {},
};

export function loadStorage(): StoredData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw) as StoredData;
    return {
      progress: parsed.progress ?? {},
      settings: { ...defaultData.settings, ...parsed.settings },
      dismissedTutorials: parsed.dismissedTutorials ?? {},
    };
  } catch {
    return { ...defaultData };
  }
}

export function saveStorage(data: StoredData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function isLevelUnlocked(levelIndex: number, progress: Record<string, ProgressEntry>, ids: string[]): boolean {
  if (levelIndex === 0) return true;
  const prevId = ids[levelIndex - 1];
  return progress[prevId]?.completed === true;
}

export function recordWin(
  data: StoredData,
  levelId: string,
  stars: number,
): StoredData {
  const prev = data.progress[levelId];
  const bestStars = Math.max(prev?.bestStars ?? 0, stars);
  return {
    ...data,
    progress: {
      ...data.progress,
      [levelId]: { bestStars, completed: true },
    },
  };
}
