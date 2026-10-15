import type { LevelDef } from '../sim/types';

const s = Math.SQRT2 - 1;
const t = 2 - Math.SQRT2;

export const cup: LevelDef = {
  id: 'cup',
  name: 'Paper cup',
  viewRotationDeg: -135,
  paper: { front: '#D85A30', back: '#F4EFE6' },
  tutorial: 'Find folds you can make now — kinked lines must wait.',
  folds: [
    {
      line: [{ x: 0, y: 1 }, { x: 1, y: 0 }],
      movingPoint: { x: 0.9, y: 0.9 },
      scope: 'all',
      direction: 'valley',
    },
    {
      line: [{ x: s, y: 0 }, { x: t, y: s }],
      movingPoint: { x: 0.95, y: 0.02 },
      scope: 'all',
      direction: 'valley',
    },
    {
      line: [{ x: 0, y: s }, { x: s, y: t }],
      movingPoint: { x: 0.02, y: 0.95 },
      scope: 'all',
      direction: 'valley',
    },
    {
      line: [{ x: 0, y: t }, { x: t, y: 0 }],
      movingPoint: { x: 0.05, y: 0.05 },
      scope: 'all',
      direction: 'valley',
    },
    {
      line: [{ x: 0, y: 0.35 }, { x: 0.65, y: 1 }],
      movingPoint: { x: 0.38, y: 0.38 },
      scope: 'all',
      direction: 'mountain',
    },
  ],
};
