import { useCallback, useMemo, useRef, useState } from 'react';
import type { CompiledLevel } from '../sim/types';
import type { GameState } from '../sim/types';
import { fromView, toView } from './viewTransform';
import { segmentDistance } from '../geometry/line';
import type { Vec } from '../geometry/vec';

const HIT_PX = 24;
const TAP_SLOP_PX = 10;

type Props = {
  level: CompiledLevel;
  game: GameState;
  rotationDeg: number;
  assist: boolean;
  pressedSegmentId: number | null;
  rejectSegmentId: number | null;
  shakeUntil: number;
  onPress: (id: number | null) => void;
  onTapFold: (foldIndex: number, segmentId: number) => void;
};

export function SheetView({
  level,
  game,
  rotationDeg,
  assist,
  pressedSegmentId,
  rejectSegmentId,
  shakeUntil,
  onPress,
  onTapFold,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pointerStart, setPointerStart] = useState<Vec | null>(null);
  const [nearestId, setNearestId] = useState<number | null>(null);

  const doneFolds = useMemo(() => new Set(game.doneOrder), [game.doneOrder]);

  const segments = useMemo(() => {
    return level.segments.map((seg) => {
      const done = doneFolds.has(seg.fold);
      const order = done ? game.doneOrder.indexOf(seg.fold) + 1 : 0;
      return { ...seg, done, order };
    });
  }, [level.segments, doneFolds, game.doneOrder]);

  const paper = useMemo(() => {
    const corners = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ].map((p) => toView(p, rotationDeg));
    return corners;
  }, [rotationDeg]);

  const viewBox = useMemo(() => {
    const xs = paper.map((p) => p.x);
    const ys = paper.map((p) => p.y);
    const pad = 0.08;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [paper]);

  const longestSegmentByFold = useMemo(() => {
    const map = new Map<number, number>();
    for (const seg of segments) {
      if (!seg.done) continue;
      const a = toView(seg.a, rotationDeg);
      const b = toView(seg.b, rotationDeg);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const prev = map.get(seg.fold) ?? -1;
      if (len > prev) map.set(seg.fold, seg.id);
    }
    return map;
  }, [segments, rotationDeg]);

  const pointerToSheet = useCallback(
    (clientX: number, clientY: number): Vec | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const svgPt = pt.matrixTransform(ctm.inverse());
      return fromView({ x: svgPt.x, y: svgPt.y }, rotationDeg);
    },
    [rotationDeg],
  );

  const findNearest = useCallback(
    (clientX: number, clientY: number): number | null => {
      const sheetPt = pointerToSheet(clientX, clientY);
      if (!sheetPt) return null;
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const scale = Math.hypot(ctm.a, ctm.b);
      let best: number | null = null;
      let bestDist = HIT_PX;
      for (const seg of segments) {
        if (seg.done) continue;
        const distSheet = segmentDistance(seg.a, seg.b, sheetPt);
        const distPx = distSheet * scale;
        if (distPx < bestDist) {
          bestDist = distPx;
          best = seg.id;
        }
      }
      return best;
    },
    [pointerToSheet, segments],
  );

  const shaking = Date.now() < shakeUntil;

  return (
    <svg
      ref={svgRef}
      className={`sheet ${shaking ? 'sheet--shake' : ''}`}
      viewBox={viewBox}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const id = findNearest(e.clientX, e.clientY);
        setNearestId(id);
        setPointerStart({ x: e.clientX, y: e.clientY });
        onPress(id);
      }}
      onPointerMove={(e) => {
        if (!pointerStart) return;
        const id = findNearest(e.clientX, e.clientY);
        setNearestId(id);
        onPress(id);
      }}
      onPointerUp={(e) => {
        const id = findNearest(e.clientX, e.clientY);
        if (pointerStart && id !== null && id === nearestId) {
          const dx = e.clientX - pointerStart.x;
          const dy = e.clientY - pointerStart.y;
          if (Math.hypot(dx, dy) < TAP_SLOP_PX) {
            const seg = level.segments.find((s) => s.id === id);
            if (seg) onTapFold(seg.fold, id);
          }
        }
        setPointerStart(null);
        setNearestId(null);
        onPress(null);
      }}
      onPointerCancel={() => {
        setPointerStart(null);
        setNearestId(null);
        onPress(null);
      }}
      onPointerLeave={() => {
        if (!pointerStart) onPress(null);
      }}
    >
      <polygon
        points={paper.map((p) => `${p.x},${p.y}`).join(' ')}
        className="sheet__paper"
      />
      {segments.map((seg) => {
        const a = toView(seg.a, rotationDeg);
        const b = toView(seg.b, rotationDeg);
        const isPressed = pressedSegmentId === seg.id;
        const isReject = rejectSegmentId === seg.id;
        let className = 'sheet__crease';
        if (seg.done) className += ' sheet__crease--done';
        if (isPressed) className += ' sheet__crease--pressed';
        if (isReject) className += ' sheet__crease--reject';
        if (assist && !seg.done) {
          className += seg.mv === 'V' ? ' sheet__crease--valley' : ' sheet__crease--mountain';
        }
        return (
          <line
            key={seg.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className={className}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {segments
        .filter((s) => s.done && longestSegmentByFold.get(s.fold) === s.id)
        .map((seg) => {
          const a = toView(seg.a, rotationDeg);
          const b = toView(seg.b, rotationDeg);
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          return (
            <g key={`badge-${seg.id}`} className="sheet__badge">
              <circle cx={mid.x} cy={mid.y} r={0.035} vectorEffect="non-scaling-stroke" />
              <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central">
                {seg.order}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
