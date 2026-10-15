import type { Vec } from './vec';
import { sub, dot, add, scale } from './vec';
import { EPS, approxEq } from './eps';
import type { Line } from './line';
import { signedDistance, side, pointOnSegment, lineFromPoints } from './line';

export function area(poly: Vec[]): number {
  let a = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function centroid(poly: Vec[]): Vec {
  const a = area(poly);
  if (Math.abs(a) < EPS) {
    let cx = 0;
    let cy = 0;
    for (const p of poly) {
      cx += p.x;
      cy += p.y;
    }
    return { x: cx / poly.length, y: cy / poly.length };
  }
  let cx = 0;
  let cy = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    const crossVal = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * crossVal;
    cy += (p.y + q.y) * crossVal;
  }
  const factor = 1 / (6 * a);
  return { x: cx * factor, y: cy * factor };
}

export function contains(poly: Vec[], p: Vec, eps = EPS): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (pointOnSegment(a, b, p, eps)) return true;
    const intersect =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + 0) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

function intersectLineSegment(a: Vec, b: Vec, line: Line, eps = EPS): Vec | null {
  const da = signedDistance(line, a);
  const db = signedDistance(line, b);
  if (Math.abs(da) < eps && Math.abs(db) < eps) return null;
  if (da * db > eps * eps) return null;
  if (Math.abs(da) < eps) return a;
  if (Math.abs(db) < eps) return b;
  const t = da / (da - db);
  return add(a, scale(sub(b, a), t));
}

function dedupePoly(pts: Vec[], eps: number): Vec[] {
  if (pts.length === 0) return [];
  const out: Vec[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || !approxEq(last.x, p.x, eps) || !approxEq(last.y, p.y, eps)) {
      out.push(p);
    }
  }
  if (out.length > 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (approxEq(first.x, last.x, eps) && approxEq(first.y, last.y, eps)) {
      out.pop();
    }
  }
  return out.length >= 3 ? out : [];
}

/** Split convex CCW polygon by line; pieces may be empty. */
export function splitByLine(poly: Vec[], line: Line, eps = EPS): { positive: Vec[]; negative: Vec[] } {
  const clipHalf = (keepPositive: boolean): Vec[] => {
    const out: Vec[] = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const cur = poly[i];
      const next = poly[(i + 1) % n];
      const sCur = side(line, cur, eps);
      const sNext = side(line, next, eps);
      const curIn = keepPositive ? sCur >= 0 : sCur <= 0;
      const nextIn = keepPositive ? sNext >= 0 : sNext <= 0;
      if (curIn) out.push(cur);
      if (curIn !== nextIn) {
        const ip = intersectLineSegment(cur, next, line, eps);
        if (ip) out.push(ip);
      }
    }
    return dedupePoly(out, eps);
  };
  return { positive: clipHalf(true), negative: clipHalf(false) };
}

/** Clip segment ab to convex polygon; returns chord inside poly. */
export function clipLine(poly: Vec[], a: Vec, b: Vec, eps = EPS): [Vec, Vec] | null {
  const line = lineFromPoints(a, b);
  const intersections: Vec[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    const ip = intersectLineSegment(p, q, line, eps);
    if (ip) intersections.push(ip);
  }
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (contains(poly, mid, eps)) {
    return [a, b];
  }
  if (intersections.length < 2) return null;
  let bestA = intersections[0];
  let bestB = intersections[1];
  let maxDist = 0;
  for (let i = 0; i < intersections.length; i++) {
    for (let j = i + 1; j < intersections.length; j++) {
      const d = dot(sub(intersections[j], intersections[i]), sub(intersections[j], intersections[i]));
      if (d > maxDist) {
        maxDist = d;
        bestA = intersections[i];
        bestB = intersections[j];
      }
    }
  }
  return maxDist < eps ? null : [bestA, bestB];
}

export function boundaryEdges(poly: Vec[]): [Vec, Vec][] {
  const edges: [Vec, Vec][] = [];
  for (let i = 0; i < poly.length; i++) {
    edges.push([poly[i], poly[(i + 1) % poly.length]]);
  }
  return edges;
}

export function edgesOverlap(a1: Vec, a2: Vec, b1: Vec, b2: Vec, eps = EPS): [Vec, Vec] | null {
  const lineA = lineFromPoints(a1, a2);
  if (side(lineA, b1, eps) !== 0 || side(lineA, b2, eps) !== 0) return null;
  const dir = sub(a2, a1);
  const lenSq = dot(dir, dir);
  if (lenSq < EPS) return null;
  const project = (p: Vec) => dot(sub(p, a1), dir) / lenSq;
  const t1 = project(b1);
  const t2 = project(b2);
  const lo = Math.max(0, Math.min(t1, t2));
  const hi = Math.min(1, Math.max(t1, t2));
  if (hi - lo < eps) return null;
  return [add(a1, scale(dir, lo)), add(a1, scale(dir, hi))];
}
