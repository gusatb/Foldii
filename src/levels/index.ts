import { compile } from '../sim/compile';
import type { CompiledLevel, LevelDef } from '../sim/types';
import { half } from './half';
import { cornerFirst } from './cornerFirst';
import { cup } from './cup';

export const levelDefs: LevelDef[] = [half, cornerFirst, cup];

const compiledCache = new Map<string, CompiledLevel>();

export function getCompiledLevel(id: string): CompiledLevel {
  const cached = compiledCache.get(id);
  if (cached) return cached;
  const def = levelDefs.find((l) => l.id === id);
  if (!def) throw new Error(`Unknown level ${id}`);
  const compiled = compile(def);
  compiledCache.set(id, compiled);
  return compiled;
}

export function allCompiledLevels(): CompiledLevel[] {
  return levelDefs.map((d) => getCompiledLevel(d.id));
}
