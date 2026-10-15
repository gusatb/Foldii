import { apply, compose, identity, reflectAcross, approxEqAffine } from '../geometry/affine';
import { collinearPoints, signedDistance, unitDir } from '../geometry/line';
import { contains } from '../geometry/polygon';
import { EPS, approxGe } from '../geometry/eps';
import type { CompiledLevel, GameState } from './types';
import type { Line } from '../geometry/line';

export function initialState(level: CompiledLevel): GameState {
  return {
    transforms: level.faces.map(() => identity),
    zOrder: level.faces.map((f) => f.id),
    doneOrder: [],
    mistakes: 0,
  };
}

type CanFoldOk = { ok: true; line: Line; moving: number[]; direction: 'valley' | 'mountain' };
type CanFoldFail = { ok: false; reason: 'done' | 'not-yet' | 'invalid' };

export function canFold(
  level: CompiledLevel,
  state: GameState,
  k: number,
): CanFoldOk | CanFoldFail {
  if (state.doneOrder.includes(k)) return { ok: false, reason: 'done' };

  const foldEdges = level.edges.filter((e) => e.fold === k);
  if (foldEdges.length === 0) return { ok: false, reason: 'invalid' };

  const mappedPoints: { x: number; y: number }[] = [];
  for (const e of foldEdges) {
    const Ta = state.transforms[e.faceA];
    mappedPoints.push(apply(Ta, e.a), apply(Ta, e.b));
  }

  const L = collinearPoints(mappedPoints);
  if (!L) return { ok: false, reason: 'not-yet' };

  for (const e of foldEdges) {
    const Ta = state.transforms[e.faceA];
    const Tb = state.transforms[e.faceB];
    if (!approxEqAffine(Ta, Tb)) {
      throw new Error('Hinge not flat');
    }
  }

  const components = connectedComponents(level, state, k);
  if (components.length <= 1) return { ok: false, reason: 'not-yet' };

  const compiled = level.folds[k];
  const mp = compiled.movingPointSheet;
  let refFace = level.faces.find((f) => contains(f.poly, mp));
  if (!refFace) {
    refFace = level.faces.find((f) =>
      f.poly.some((v) => Math.hypot(v.x - mp.x, v.y - mp.y) < EPS),
    );
  }
  if (!refFace) return { ok: false, reason: 'invalid' };

  const refPoint = apply(state.transforms[refFace.id], mp);
  if (signedDistance(L, refPoint) < 0) {
    const u = unitDir(L);
    L.dir = { x: -u.x, y: -u.y };
  }

  const movingComps: number[] = [];
  for (let ci = 0; ci < components.length; ci++) {
    const comp = components[ci];
    const allPos = comp.every((faceId) => {
      const face = level.faces[faceId];
      return face.poly
        .map((v) => apply(state.transforms[faceId], v))
        .every((v) => approxGe(signedDistance(L, v), 0));
    });
    if (allPos) movingComps.push(ci);
  }

  if (movingComps.length === 0) return { ok: false, reason: 'not-yet' };

  const movingFaces = new Set<number>();
  for (const ci of movingComps) {
    for (const f of components[ci]) movingFaces.add(f);
  }

  for (const e of foldEdges) {
    const aMoves = movingFaces.has(e.faceA);
    const bMoves = movingFaces.has(e.faceB);
    if (aMoves === bMoves) return { ok: false, reason: 'not-yet' };
  }

  return {
    ok: true,
    line: L,
    moving: [...movingFaces],
    direction: compiled.direction,
  };
}

function connectedComponents(level: CompiledLevel, _state: GameState, excludeFold: number): number[][] {
  const n = level.faces.length;
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (const e of level.edges) {
    if (e.fold === excludeFold) continue;
    adj[e.faceA].add(e.faceB);
    adj[e.faceB].add(e.faceA);
  }
  const visited = new Array(n).fill(false);
  const comps: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    const comp: number[] = [];
    const stack = [i];
    visited[i] = true;
    while (stack.length > 0) {
      const v = stack.pop()!;
      comp.push(v);
      for (const w of adj[v]) {
        if (!visited[w]) {
          visited[w] = true;
          stack.push(w);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

export function applyFold(
  _level: CompiledLevel,
  state: GameState,
  k: number,
  check: CanFoldOk,
): GameState {
  const R = reflectAcross(check.line);
  const transforms = state.transforms.map((T, i) =>
    check.moving.includes(i) ? compose(R, T) : T,
  );

  let zOrder = [...state.zOrder];
  const movingSet = new Set(check.moving);
  const staticOrder = zOrder.filter((id) => !movingSet.has(id));
  const movingOrder = zOrder.filter((id) => movingSet.has(id));
  const reversed = [...movingOrder].reverse();

  if (check.direction === 'valley') {
    zOrder = [...staticOrder, ...reversed];
  } else {
    zOrder = [...reversed, ...staticOrder];
  }

  return {
    transforms,
    zOrder,
    doneOrder: [...state.doneOrder, k],
    mistakes: state.mistakes,
  };
}

export function isWin(state: GameState, level: CompiledLevel): boolean {
  return state.doneOrder.length === level.folds.length;
}

export function starsFor(mistakes: number, assistOn: boolean): number {
  let stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  if (assistOn) stars = Math.min(stars, 2);
  return stars;
}
