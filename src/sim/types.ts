import type { Vec } from '../geometry/vec';
import type { Affine } from '../geometry/affine';

export type FoldDirection = 'valley' | 'mountain';
export type FoldScope = 'all' | 'top' | 'bottom';

export interface FoldSpec {
  line: [Vec, Vec];
  movingPoint: Vec;
  scope: FoldScope;
  direction: FoldDirection;
}

export interface LevelDef {
  id: string;
  name: string;
  viewRotationDeg: number;
  paper: { front: string; back: string };
  folds: FoldSpec[];
  tutorial?: string;
}

export interface Face {
  id: number;
  poly: Vec[];
}

export interface CreaseSegment {
  id: number;
  fold: number;
  a: Vec;
  b: Vec;
  mv: 'M' | 'V';
}

export interface Edge {
  faceA: number;
  faceB: number;
  fold: number;
  a: Vec;
  b: Vec;
}

export interface CompiledFold {
  index: number;
  segmentIds: number[];
  movingPointSheet: Vec;
  direction: FoldDirection;
}

export interface CompiledLevel {
  def: LevelDef;
  faces: Face[];
  segments: CreaseSegment[];
  edges: Edge[];
  folds: CompiledFold[];
  authoredTransforms: Affine[];
}

export interface GameState {
  transforms: Affine[];
  zOrder: number[];
  doneOrder: number[];
  mistakes: number;
}
