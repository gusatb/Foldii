import type { LevelDef } from '../sim/types';

export const cornerFirst: LevelDef = {
  id: 'corner-first',
  name: 'Corner first',
  viewRotationDeg: 0,
  paper: { front: '#D85A30', back: '#F4EFE6' },
  tutorial: 'A crease that bends where it meets another crease was folded after it.',
  folds: [
    {
      line: [{ x: 0.6, y: 0 }, { x: 0, y: 0.6 }],
      movingPoint: { x: 0.1, y: 0.1 },
      scope: 'all',
      direction: 'valley',
    },
    {
      line: [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }],
      movingPoint: { x: 0.9, y: 0.5 },
      scope: 'all',
      direction: 'valley',
    },
  ],
};
