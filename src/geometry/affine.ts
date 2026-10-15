import type { Vec } from './vec';
import { EPS, approxEq } from './eps';
import type { Line } from './line';
import { unitDir } from './line';

/** x' = a*x + c*y + e ;  y' = b*x + d*y + f */
export type Affine = { a: number; b: number; c: number; d: number; e: number; f: number };

export const identity: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function det(T: Affine): number {
  return T.a * T.d - T.b * T.c;
}

export function apply(T: Affine, p: Vec): Vec {
  return {
    x: T.a * p.x + T.c * p.y + T.e,
    y: T.b * p.x + T.d * p.y + T.f,
  };
}

export function compose(A: Affine, B: Affine): Affine {
  return {
    a: A.a * B.a + A.c * B.b,
    b: A.b * B.a + A.d * B.b,
    c: A.a * B.c + A.c * B.d,
    d: A.b * B.c + A.d * B.d,
    e: A.a * B.e + A.c * B.f + A.e,
    f: A.b * B.e + A.d * B.f + A.f,
  };
}

export function invert(T: Affine): Affine {
  const d = det(T);
  if (Math.abs(d) < EPS) throw new Error('Singular affine transform');
  const invDet = 1 / d;
  return {
    a: T.d * invDet,
    b: -T.b * invDet,
    c: -T.c * invDet,
    d: T.a * invDet,
    e: (T.c * T.f - T.d * T.e) * invDet,
    f: (T.b * T.e - T.a * T.f) * invDet,
  };
}

export function reflectAcross(line: Line): Affine {
  const p = line.origin;
  const u = unitDir(line);
  const ux = u.x;
  const uy = u.y;
  const a = 2 * ux * ux - 1;
  const b = 2 * uy * ux;
  const c = 2 * ux * uy;
  const d = 2 * uy * uy - 1;
  const e = p.x - (a * p.x + c * p.y);
  const f = p.y - (b * p.x + d * p.y);
  return { a, b, c, d, e, f };
}

export function approxEqAffine(A: Affine, B: Affine, eps = EPS): boolean {
  return (
    approxEq(A.a, B.a, eps) &&
    approxEq(A.b, B.b, eps) &&
    approxEq(A.c, B.c, eps) &&
    approxEq(A.d, B.d, eps) &&
    approxEq(A.e, B.e, eps) &&
    approxEq(A.f, B.f, eps)
  );
}

export function applyPoly(T: Affine, poly: Vec[]): Vec[] {
  return poly.map((p) => apply(T, p));
}
