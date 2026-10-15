import type { Vec } from './vec';
import { sub, dot, length, scale, add } from './vec';
import { EPS, approxEq, approxGe, approxLe } from './eps';

export type Line = { origin: Vec; dir: Vec };

export function lineFromPoints(a: Vec, b: Vec): Line {
  const d = sub(b, a);
  if (length(d) < EPS) throw new Error('Degenerate line');
  return { origin: a, dir: d };
}

export function unitDir(line: Line): Vec {
  const len = length(line.dir);
  if (len < EPS) throw new Error('Degenerate line direction');
  return scale(line.dir, 1 / len);
}

/** Signed distance from point to line (positive on left of dir). */
export function signedDistance(line: Line, p: Vec): number {
  const u = unitDir(line);
  const v = sub(p, line.origin);
  return cross2(u, v);
}

function cross2(a: Vec, b: Vec): number {
  return a.x * b.y - a.y * b.x;
}

export type Side = -1 | 0 | 1;

export function side(line: Line, p: Vec, eps = EPS): Side {
  const d = signedDistance(line, p);
  if (d > eps) return 1;
  if (d < -eps) return -1;
  return 0;
}

export function pointOnSegment(a: Vec, b: Vec, p: Vec, eps = EPS): boolean {
  if (side(lineFromPoints(a, b), p, eps) !== 0) return false;
  const ab = sub(b, a);
  const ap = sub(p, a);
  const t = dot(ap, ab) / dot(ab, ab);
  return approxGe(t, 0, eps) && approxLe(t, 1, eps);
}

export function segmentDistance(a: Vec, b: Vec, p: Vec): number {
  const ab = sub(b, a);
  const lenSq = dot(ab, ab);
  if (lenSq < EPS) return length(sub(p, a));
  let t = dot(sub(p, a), ab) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closest = add(a, scale(ab, t));
  return length(sub(p, closest));
}

export function collinearPoints(points: Vec[], eps = EPS): Line | null {
  if (points.length < 2) return null;
  const line = lineFromPoints(points[0], points[1]);
  for (let i = 2; i < points.length; i++) {
    if (side(line, points[i], eps) !== 0) return null;
  }
  return line;
}

export function linesCollinear(L1: Line, L2: Line, eps = EPS): boolean {
  if (side(L1, L2.origin, eps) !== 0) return false;
  const u1 = unitDir(L1);
  const u2 = unitDir(L2);
  const cross = Math.abs(u1.x * u2.y - u1.y * u2.x);
  return cross < eps || approxEq(cross, 1, eps);
}
