import { c, type Complex } from './complex';

/** Row-major 2x2 complex matrix: [m00, m01, m10, m11]. */
export type Mat2 = readonly [Complex, Complex, Complex, Complex];

const S = Math.SQRT1_2;

export const X: Mat2 = [c(0), c(1), c(1), c(0)];
export const Z: Mat2 = [c(1), c(0), c(0), c(-1)];
export const H: Mat2 = [c(S), c(S), c(S), c(-S)];
export const I2: Mat2 = [c(1), c(0), c(0), c(1)];

/** RY(theta) = [[cos t/2, -sin t/2], [sin t/2, cos t/2]] */
export function RY(theta: number): Mat2 {
  const co = Math.cos(theta / 2);
  const si = Math.sin(theta / 2);
  return [c(co), c(-si), c(si), c(co)];
}

/** theta such that RY(theta)|0> = (|0> + sqrt(r)|1>)/sqrt(1+r): odds r:1 for outcome 1 vs 0. */
export const thetaForOdds = (r: number): number => 2 * Math.atan(Math.sqrt(r));

/** Verifies M^dagger M = I (used by tests). */
export function isUnitary(m: Mat2, tol = 1e-12): boolean {
  const [a, b, cc, d] = m;
  const col0 = a.re * a.re + a.im * a.im + cc.re * cc.re + cc.im * cc.im;
  const col1 = b.re * b.re + b.im * b.im + d.re * d.re + d.im * d.im;
  // <col0|col1> = conj(a)*b + conj(c)*d
  const re = a.re * b.re + a.im * b.im + cc.re * d.re + cc.im * d.im;
  const im = a.re * b.im - a.im * b.re + cc.re * d.im - cc.im * d.re;
  return Math.abs(col0 - 1) < tol && Math.abs(col1 - 1) < tol && Math.abs(re) < tol && Math.abs(im) < tol;
}
