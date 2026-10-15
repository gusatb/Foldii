export const EPS = 1e-7;

export function approxEq(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps;
}

export function approxZero(a: number, eps = EPS): boolean {
  return Math.abs(a) <= eps;
}

export function approxLe(a: number, b: number, eps = EPS): boolean {
  return a <= b + eps;
}

export function approxGe(a: number, b: number, eps = EPS): boolean {
  return a >= b - eps;
}
