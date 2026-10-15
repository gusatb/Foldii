import type { Vec } from '../geometry/vec';

const DEG = Math.PI / 180;

export function toView(p: Vec, rotationDeg: number): Vec {
  const rad = rotationDeg * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = p.x * cos - p.y * sin;
  const ry = p.x * sin + p.y * cos;
  return { x: rx, y: -ry };
}

export function fromView(p: Vec, rotationDeg: number): Vec {
  const rad = rotationDeg * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = p.x;
  const sy = -p.y;
  return {
    x: sx * cos + sy * sin,
    y: -sx * sin + sy * cos,
  };
}

export function polyToPath(points: Vec[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
}
