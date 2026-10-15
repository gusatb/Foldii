import type { LevelDef } from '../sim/types';

export const half: LevelDef = {
  id: 'half',
  name: 'Half',
  viewRotationDeg: 0,
  paper: { front: '#D85A30', back: '#F4EFE6' },
  tutorial: 'Tap a crease to fold along it.',
  folds: [
    {
      line: [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }],
      movingPoint: { x: 0.9, y: 0.5 },
      scope: 'all',
      direction: 'valley',
    },
  ],
};
