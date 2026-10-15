import type { Vec } from '../geometry/vec';
import { apply, compose, det, identity, invert, reflectAcross } from '../geometry/affine';
import { lineFromPoints, signedDistance, side } from '../geometry/line';
import { area, contains, edgesOverlap, splitByLine } from '../geometry/polygon';
import { EPS, approxEq } from '../geometry/eps';
import type {
  CompiledFold,
  CompiledLevel,
  CreaseSegment,
  Edge,
  Face,
  LevelDef,
} from './types';

type Piece = { poly: Vec[]; T: typeof identity; z: number; uid: number };

let uidCounter = 0;

function unitSquare(): Vec[] {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
}

function orientLine(line: [Vec, Vec], movingPoint: Vec) {
  let L = lineFromPoints(line[0], line[1]);
  if (signedDistance(L, movingPoint) < 0) {
    L = lineFromPoints(line[1], line[0]);
  }
  if (Math.abs(signedDistance(L, movingPoint)) < EPS) {
    throw new Error('movingPoint lies on fold line');
  }
  return L;
}

function foldedPoly(p: Piece): Vec[] {
  return p.poly.map((v) => apply(p.T, v));
}

function bothSides(poly: Vec[], L: ReturnType<typeof lineFromPoints>): boolean {
  let pos = false;
  let neg = false;
  for (const v of poly) {
    const d = signedDistance(L, v);
    if (d > EPS) pos = true;
    if (d < -EPS) neg = true;
  }
  return pos && neg;
}

function allOnPositive(poly: Vec[], L: ReturnType<typeof lineFromPoints>): boolean {
  return poly.every((v) => signedDistance(L, v) >= -EPS);
}

function buildAdjacency(pieces: Piece[]): Map<number, Set<number>> {
  const adj = new Map<number, Set<number>>();
  for (const p of pieces) adj.set(p.uid, new Set());
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      if (shareBoundary(pieces[i].poly, pieces[j].poly)) {
        adj.get(pieces[i].uid)!.add(pieces[j].uid);
        adj.get(pieces[j].uid)!.add(pieces[i].uid);
      }
    }
  }
  return adj;
}

function shareBoundary(a: Vec[], b: Vec[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      if (edgesOverlap(a1, a2, b[j], b[(j + 1) % b.length])) return true;
    }
  }
  return false;
}

function segmentOnLine(poly: Vec[], L: ReturnType<typeof lineFromPoints>): [Vec, Vec] | null {
  const pts: Vec[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (side(L, a) === 0) pts.push(a);
    if (side(L, b) === 0) pts.push(b);
    const da = signedDistance(L, a);
    const db = signedDistance(L, b);
    if (da * db < -EPS * EPS) {
      const t = da / (da - db);
      pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  if (pts.length < 2) return null;
  let best: [Vec, Vec] | null = null;
  let bestLen = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const len = Math.hypot(pts[j].x - pts[i].x, pts[j].y - pts[i].y);
      if (len > bestLen) {
        bestLen = len;
        best = [pts[i], pts[j]];
      }
    }
  }
  return bestLen > EPS ? best : null;
}

function pointOnSeg(a: Vec, b: Vec, p: Vec): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const d1 = Math.hypot(p.x - a.x, p.y - a.y);
  const d2 = Math.hypot(p.x - b.x, p.y - b.y);
  return d1 + d2 <= d + EPS;
}

function chordOnSegment(seg: CreaseSegment, a: Vec, b: Vec): boolean {
  const L = lineFromPoints(seg.a, seg.b);
  if (side(L, a) !== 0 || side(L, b) !== 0) return false;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return pointOnSeg(seg.a, seg.b, mid);
}

function sharedBoundaryFold(a: Vec[], b: Vec[], segments: CreaseSegment[]): number | null {
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const ov = edgesOverlap(a1, a2, b[j], b[(j + 1) % b.length]);
      if (!ov) continue;
      for (const s of segments) {
        if (chordOnSegment(s, ov[0], ov[1])) return s.fold;
      }
    }
  }
  return null;
}

function floodFrom(
  seed: Piece,
  pieces: Piece[],
  adj: Map<number, Set<number>>,
  blockedFold: number,
  segments: CreaseSegment[],
): Set<number> {
  const reached = new Set<number>([seed.uid]);
  const queue = [seed.uid];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const nid of adj.get(id) ?? []) {
      if (reached.has(nid)) continue;
      const pi = pieces.find((p) => p.uid === id)!;
      const pj = pieces.find((p) => p.uid === nid)!;
      if (sharedBoundaryFold(pi.poly, pj.poly, segments) === blockedFold) continue;
      reached.add(nid);
      queue.push(nid);
    }
  }
  return reached;
}

function findFoldForChord(a: Vec, b: Vec, segments: CreaseSegment[]): number {
  const matches = segments.filter((s) => chordOnSegment(s, a, b));
  if (matches.length === 0) throw new Error('Internal edge matches no segment');
  const folds = new Set(matches.map((m) => m.fold));
  if (folds.size > 1) throw new Error('Internal edge matches multiple folds');
  return matches[0].fold;
}

function modelContains(pieces: Piece[], point: Vec): boolean {
  for (const p of pieces) {
    if (contains(foldedPoly(p), point)) return true;
  }
  return false;
}

export function compile(def: LevelDef): CompiledLevel {
  uidCounter = 0;
  let pieces: Piece[] = [{ poly: unitSquare(), T: identity, z: 0, uid: uidCounter++ }];
  const segments: CreaseSegment[] = [];
  let segmentId = 0;
  const compiledFolds: CompiledFold[] = [];

  for (let k = 0; k < def.folds.length; k++) {
    const spec = def.folds[k];
    const L = orientLine(spec.line, spec.movingPoint);

    if (!modelContains(pieces, spec.movingPoint)) {
      throw new Error(`Fold ${k}: movingPoint not inside folded model`);
    }

    let toSplit: Piece[] = [];
    if (spec.scope === 'all') {
      toSplit = pieces.filter((p) => bothSides(foldedPoly(p), L));
    } else {
      const hits = pieces.filter((p) => contains(foldedPoly(p), spec.movingPoint));
      if (hits.length === 0) throw new Error(`Fold ${k}: no piece contains movingPoint`);
      const target =
        spec.scope === 'top'
          ? hits.reduce((a, b) => (a.z > b.z ? a : b))
          : hits.reduce((a, b) => (a.z < b.z ? a : b));
      if (!bothSides(foldedPoly(target), L)) {
        throw new Error(`Fold ${k}: fold line does not cross target piece`);
      }
      toSplit = [target];
    }

    const splitIds = new Set(toSplit.map((p) => p.uid));
    const foldSegmentIds: number[] = [];
    const next: Piece[] = [];

    for (const p of pieces) {
      if (!splitIds.has(p.uid)) {
        next.push(p);
        continue;
      }
      const folded = foldedPoly(p);
      const { positive, negative } = splitByLine(folded, L);
      const Tinv = invert(p.T);

      const recordChord = (half: Vec[]) => {
        const chord = segmentOnLine(half, L);
        if (!chord) return;
        const a = apply(Tinv, chord[0]);
        const b = apply(Tinv, chord[1]);
        const mv: 'M' | 'V' = spec.direction === 'valley' === (det(p.T) > 0) ? 'V' : 'M';
        const seg = { id: segmentId++, fold: k, a, b, mv };
        segments.push(seg);
        foldSegmentIds.push(seg.id);
      };

      recordChord(positive);
      recordChord(negative);

      if (positive.length >= 3) {
        next.push({
          poly: positive.map((v) => apply(Tinv, v)),
          T: p.T,
          z: p.z,
          uid: uidCounter++,
        });
      }
      if (negative.length >= 3) {
        next.push({
          poly: negative.map((v) => apply(Tinv, v)),
          T: p.T,
          z: p.z,
          uid: uidCounter++,
        });
      }
    }
    pieces = next;
    const adj = buildAdjacency(pieces);

    let moving: Piece[] = [];
    if (spec.scope === 'all') {
      moving = pieces.filter((p) => allOnPositive(foldedPoly(p), L));
    } else {
      const positiveSeed = pieces.find(
        (p) => contains(foldedPoly(p), spec.movingPoint) && allOnPositive(foldedPoly(p), L),
      );
      if (!positiveSeed) throw new Error(`Fold ${k}: no positive piece at movingPoint`);
      const reached = floodFrom(positiveSeed, pieces, adj, k, segments);
      moving = pieces.filter((p) => reached.has(p.uid));
      for (const m of moving) {
        if (!allOnPositive(foldedPoly(m), L)) {
          throw new Error(`Fold ${k}: partial fold would tear paper`);
        }
      }
    }

    if (moving.length === 0) throw new Error(`Fold ${k}: empty moving set`);

    const refPiece = moving
      .filter((p) => contains(foldedPoly(p), spec.movingPoint))
      .sort((a, b) => b.z - a.z)[0];
    const movingPointSheet = apply(invert(refPiece.T), spec.movingPoint);

    const R = reflectAcross(L);
    const maxZ = Math.max(...pieces.map((p) => p.z));
    const minZ = Math.min(...pieces.map((p) => p.z));
    const movingUids = new Set(moving.map((p) => p.uid));

    const sortedMoving =
      spec.direction === 'valley'
        ? [...moving].sort((a, b) => b.z - a.z)
        : [...moving].sort((a, b) => a.z - b.z);

    pieces = pieces.map((p) =>
      movingUids.has(p.uid) ? { ...p, T: compose(R, p.T) } : p,
    );

    for (let i = 0; i < sortedMoving.length; i++) {
      const piece = pieces.find((p) => p.uid === sortedMoving[i].uid)!;
      piece.z = spec.direction === 'valley' ? maxZ + 1 + i : minZ - 1 - i;
    }

    compiledFolds.push({
      index: k,
      segmentIds: [...new Set(foldSegmentIds)],
      movingPointSheet,
      direction: spec.direction,
    });
  }

  const faces: Face[] = pieces.map((p, i) => ({ id: i, poly: p.poly }));
  const authoredTransforms = pieces.map((p) => p.T);

  const edges: Edge[] = [];
  for (let i = 0; i < faces.length; i++) {
    for (let j = i + 1; j < faces.length; j++) {
      const fi = faces[i];
      const fj = faces[j];
      for (let a = 0; a < fi.poly.length; a++) {
        const a1 = fi.poly[a];
        const a2 = fi.poly[(a + 1) % fi.poly.length];
        for (let b = 0; b < fj.poly.length; b++) {
          const ov = edgesOverlap(a1, a2, fj.poly[b], fj.poly[(b + 1) % fj.poly.length]);
          if (!ov) continue;
          const fold = findFoldForChord(ov[0], ov[1], segments);
          edges.push({ faceA: i, faceB: j, fold, a: ov[0], b: ov[1] });
        }
      }
    }
  }

  const totalArea = faces.reduce((s, f) => s + Math.abs(area(f.poly)), 0);
  if (!approxEq(totalArea, 1)) {
    throw new Error(`Face areas sum to ${totalArea}, expected 1`);
  }

  for (const fold of compiledFolds) {
    if (fold.segmentIds.length === 0) throw new Error(`Fold ${fold.index} has no segments`);
  }

  return {
    def,
    faces,
    segments,
    edges,
    folds: compiledFolds,
    authoredTransforms,
  };
}
