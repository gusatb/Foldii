import { EPS, approxEq } from './eps';

export type Vec = { x: number; y: number };

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec, s: number): Vec {
  return { x: v.x * s, y: v.y * s };
}

export function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec, b: Vec): number {
  return a.x * b.y - a.y * b.x;
}

export function length(v: Vec): number {
  return Math.hypot(v.x, v.y);
}

export function lerp(a: Vec, b: Vec, t: number): Vec {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function dist(a: Vec, b: Vec): number {
  return length(sub(a, b));
}

export function approxEqVec(a: Vec, b: Vec, eps = EPS): boolean {
  return approxEq(a.x, b.x, eps) && approxEq(a.y, b.y, eps);
}

export function normalize(v: Vec): Vec {
  const len = length(v);
  if (len < EPS) return { x: 0, y: 0 };
  return scale(v, 1 / len);
}
