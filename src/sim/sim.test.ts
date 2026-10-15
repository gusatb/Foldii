import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { initialState, canFold, applyFold, starsFor } from './play';
import { half } from '../levels/half';
import { cornerFirst } from '../levels/cornerFirst';
import { cup } from '../levels/cup';
import { apply, reflectAcross } from '../geometry/affine';
import { lineFromPoints } from '../geometry/line';
import { splitByLine } from '../geometry/polygon';

function playAuthoredOrder(def: typeof half) {
  const level = compile(def);
  let state = initialState(level);
  for (let k = 0; k < level.folds.length; k++) {
    const check = canFold(level, state, k);
    expect(check.ok).toBe(true);
    if (check.ok) state = applyFold(level, state, k, check);
  }
  expect(state.doneOrder.length).toBe(level.folds.length);
  return { level, state };
}

describe('geometry', () => {
  it('reflectAcross flips across vertical midline', () => {
    const L = lineFromPoints({ x: 0.5, y: 0 }, { x: 0.5, y: 1 });
    const R = reflectAcross(L);
    const p = { x: 0.75, y: 0.25 };
    const reflected = apply(R, p);
    expect(reflected.x).toBeCloseTo(0.25, 6);
    expect(reflected.y).toBeCloseTo(0.25, 6);
  });

  it('splitByLine bisects unit square vertically', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const L = lineFromPoints({ x: 0.5, y: 0 }, { x: 0.5, y: 1 });
    const { positive, negative } = splitByLine(poly, L);
    expect(positive.length).toBeGreaterThanOrEqual(3);
    expect(negative.length).toBeGreaterThanOrEqual(3);
  });
});

describe('levels', () => {
  it('compiles all levels', () => {
    expect(() => compile(half)).not.toThrow();
    expect(() => compile(cornerFirst)).not.toThrow();
    expect(() => compile(cup)).not.toThrow();
  });

  it('authored order solves half', () => {
    playAuthoredOrder(half);
  });

  it('authored order solves corner-first', () => {
    playAuthoredOrder(cornerFirst);
  });

  it('authored order solves cup', () => {
    playAuthoredOrder(cup);
  });

  it('corner-first rejects vertical fold before diagonal', () => {
    const level = compile(cornerFirst);
    const state = initialState(level);
    const check = canFold(level, state, 1);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe('not-yet');
  });

  it('corner-first accepts reversed valid order', () => {
    const level = compile(cornerFirst);
    let state = initialState(level);
    let check = canFold(level, state, 0);
    expect(check.ok).toBe(true);
    if (check.ok) state = applyFold(level, state, 0, check);
    check = canFold(level, state, 1);
    expect(check.ok).toBe(true);
  });
});

describe('starsFor', () => {
  it('caps assist at 2 stars', () => {
    expect(starsFor(0, true)).toBe(2);
    expect(starsFor(0, false)).toBe(3);
  });
});
