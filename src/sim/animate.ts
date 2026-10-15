import type { Vec } from '../geometry/vec';
import { signedDistance, unitDir } from '../geometry/line';
import type { Line } from '../geometry/line';
import { apply } from '../geometry/affine';
import type { Affine } from '../geometry/affine';
import type { CompiledLevel } from './types';

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function squashPoint(p: Vec, L: Line, theta: number): Vec {
  const d = signedDistance(L, p);
  const u = unitDir(L);
  const n = { x: -u.y, y: u.x };
  const toward = d >= 0 ? 1 : -1;
  const nx = n.x * toward;
  const ny = n.y * toward;
  const factor = 1 - Math.cos(theta);
  return {
    x: p.x - nx * Math.abs(d) * factor,
    y: p.y - ny * Math.abs(d) * factor,
  };
}

export function animatedFacePolys(
  level: CompiledLevel,
  transforms: Affine[],
  moving: number[],
  L: Line,
  progress: number,
): Map<number, Vec[]> {
  const theta = Math.PI * easeInOutCubic(progress);
  const result = new Map<number, Vec[]>();
  for (const face of level.faces) {
    const folded = face.poly.map((v) => apply(transforms[face.id], v));
    if (moving.includes(face.id)) {
      result.set(face.id, folded.map((p) => squashPoint(p, L, theta)));
    } else {
      result.set(face.id, folded);
    }
  }
  return result;
}

export function modelBounds(polys: Vec[][]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polys) {
    for (const p of poly) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { minX, minY, maxX, maxY };
}
