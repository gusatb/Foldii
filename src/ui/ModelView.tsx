import { useEffect, useMemo, useState } from 'react';
import { det, apply } from '../geometry/affine';
import type { CompiledLevel, GameState } from '../sim/types';
import { animatedFacePolys, modelBounds } from '../sim/animate';
import { toView, polyToPath } from './viewTransform';
import type { Line } from '../geometry/line';
import { unitDir } from '../geometry/line';

type Props = {
  level: CompiledLevel;
  game: GameState;
  rotationDeg: number;
  animation: {
    progress: number;
    line: Line;
    moving: number[];
    direction: 'valley' | 'mountain';
  } | null;
};

function darken(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const f = 1 - amount;
  const dr = Math.round(r * f);
  const dg = Math.round(g * f);
  const db = Math.round(b * f);
  return `rgb(${dr},${dg},${db})`;
}

export function ModelView({ level, game, rotationDeg, animation }: Props) {
  const [viewBox, setViewBox] = useState('0 0 1 1');

  const polysByFace = useMemo(() => {
    if (animation) {
      return animatedFacePolys(level, game.transforms, animation.moving, animation.line, animation.progress);
    }
    const map = new Map<number, { x: number; y: number }[]>();
    for (const face of level.faces) {
      map.set(face.id, face.poly.map((v) => apply(game.transforms[face.id], v)));
    }
    return map;
  }, [level, game.transforms, animation]);

  const drawOrder = useMemo(() => {
    const base = [...game.zOrder];
    if (!animation) return base;
    const moving = new Set(animation.moving);
    const staticFaces = base.filter((id) => !moving.has(id));
    const movingFaces = base.filter((id) => moving.has(id));
    const reversed = [...movingFaces].reverse();
    const pastHalf = animation.progress >= 0.5;
    const orderedMoving = pastHalf ? reversed : movingFaces;
    if (animation.direction === 'valley') {
      return [...staticFaces, ...orderedMoving];
    }
    return [...orderedMoving, ...staticFaces];
  }, [game.zOrder, animation]);

  const targetViewBox = useMemo(() => {
    const allPolys = drawOrder.map((id) => polysByFace.get(id) ?? []);
    const bounds = modelBounds(allPolys);
    const pad = 0.12;
    const w = bounds.maxX - bounds.minX || 1;
    const h = bounds.maxY - bounds.minY || 1;
    const px = w * pad;
    const py = h * pad;
    const minX = bounds.minX - px;
    const minY = bounds.minY - py;
    const vw = w + 2 * px;
    const vh = h + 2 * py;
    const corners = [
      { x: minX, y: minY },
      { x: minX + vw, y: minY },
      { x: minX + vw, y: minY + vh },
      { x: minX, y: minY + vh },
    ].map((p) => toView(p, rotationDeg));
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    const vx = Math.min(...xs);
    const vy = Math.min(...ys);
    const vw2 = Math.max(...xs) - vx;
    const vh2 = Math.max(...ys) - vy;
    return `${vx} ${vy} ${vw2} ${vh2}`;
  }, [drawOrder, polysByFace, rotationDeg]);

  useEffect(() => {
    setViewBox(targetViewBox);
  }, [targetViewBox]);

  const foldLine = useMemo(() => {
    if (!animation) return null;
    const u = unitDir(animation.line);
    const p = animation.line.origin;
    const a = { x: p.x - u.x * 2, y: p.y - u.y * 2 };
    const b = { x: p.x + u.x * 2, y: p.y + u.y * 2 };
    const va = toView(a, rotationDeg);
    const vb = toView(b, rotationDeg);
    return { va, vb };
  }, [animation, rotationDeg]);

  const theta = animation ? Math.PI * animation.progress : 0;
  const lift = animation ? Math.sin(theta) * 0.15 : 0;

  return (
    <svg className="model" viewBox={viewBox}>
      {drawOrder.map((faceId) => {
        const folded = polysByFace.get(faceId) ?? [];
        const viewed = folded.map((p) => toView(p, rotationDeg));
        const T = game.transforms[faceId];
        const front = det(T) > 0;
        const flipAtHalf = animation && animation.moving.includes(faceId) && animation.progress >= 0.5;
        const showFront = flipAtHalf ? !front : front;
        const baseColor = showFront ? level.def.paper.front : level.def.paper.back;
        const isMoving = animation?.moving.includes(faceId);
        const fill = isMoving ? darken(baseColor, lift) : baseColor;
        return (
          <path
            key={faceId}
            d={polyToPath(viewed)}
            fill={fill}
            className="model__face"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {foldLine && (
        <line
          x1={foldLine.va.x}
          y1={foldLine.va.y}
          x2={foldLine.vb.x}
          y2={foldLine.vb.y}
          className="model__fold-line"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
