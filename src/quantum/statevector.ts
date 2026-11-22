import type { Mat2 } from './gates';
import { X } from './gates';

/**
 * Pure statevector of n qubits stored as two Float64Arrays (real / imaginary).
 *
 * Indexing convention (documented in QUANTUM_EXPLANATION.md):
 *   basis index i, qubit q has value (i >> q) & 1.
 * For the 8-qubit house register we choose q = 8 - address, so that the binary
 * representation of i, written MSB first, IS the displayed string
 *   CAT I1 I0 P2 P1 P0 T1 T0.
 */
export class StateVector {
  readonly n: number;
  readonly dim: number;
  re: Float64Array;
  im: Float64Array;

  constructor(n: number) {
    this.n = n;
    this.dim = 1 << n;
    this.re = new Float64Array(this.dim);
    this.im = new Float64Array(this.dim);
    this.re[0] = 1; // |00...0>
  }

  clone(): StateVector {
    const s = new StateVector(this.n);
    s.re.set(this.re);
    s.im.set(this.im);
    return s;
  }

  private check(q: number) {
    if (!Number.isInteger(q) || q < 0 || q >= this.n) throw new Error(`Qubit index ${q} out of range for ${this.n} qubits`);
  }

  /** Apply a single-qubit unitary to qubit q. */
  apply1(q: number, m: Mat2): this {
    this.check(q);
    const bit = 1 << q;
    const [m00, m01, m10, m11] = m;
    const { re, im } = this;
    for (let i = 0; i < this.dim; i++) {
      if (i & bit) continue;
      const j = i | bit;
      const a0r = re[i], a0i = im[i], a1r = re[j], a1i = im[j];
      re[i] = m00.re * a0r - m00.im * a0i + m01.re * a1r - m01.im * a1i;
      im[i] = m00.re * a0i + m00.im * a0r + m01.re * a1i + m01.im * a1r;
      re[j] = m10.re * a0r - m10.im * a0i + m11.re * a1r - m11.im * a1i;
      im[j] = m10.re * a0i + m10.im * a0r + m11.re * a1i + m11.im * a1r;
    }
    return this;
  }

  /** Apply single-qubit unitary m to target only on the subspace where control = 1. */
  applyControlled1(control: number, target: number, m: Mat2): this {
    this.check(control);
    this.check(target);
    if (control === target) throw new Error('Control and target must differ');
    const cb = 1 << control;
    const tb = 1 << target;
    const [m00, m01, m10, m11] = m;
    const { re, im } = this;
    for (let i = 0; i < this.dim; i++) {
      if (!(i & cb) || i & tb) continue;
      const j = i | tb;
      const a0r = re[i], a0i = im[i], a1r = re[j], a1i = im[j];
      re[i] = m00.re * a0r - m00.im * a0i + m01.re * a1r - m01.im * a1i;
      im[i] = m00.re * a0i + m00.im * a0r + m01.re * a1i + m01.im * a1r;
      re[j] = m10.re * a0r - m10.im * a0i + m11.re * a1r - m11.im * a1i;
      im[j] = m10.re * a0i + m10.im * a0r + m11.re * a1i + m11.im * a1r;
    }
    return this;
  }

  cnot(control: number, target: number): this {
    return this.applyControlled1(control, target, X);
  }

  /** Controlled-Z: phase -1 on |11> of qubits a, b (symmetric). */
  cz(a: number, b: number): this {
    this.check(a);
    this.check(b);
    if (a === b) throw new Error('CZ needs two distinct qubits');
    const mask = (1 << a) | (1 << b);
    for (let i = 0; i < this.dim; i++) {
      if ((i & mask) === mask) {
        this.re[i] = -this.re[i];
        this.im[i] = -this.im[i];
      }
    }
    return this;
  }

  probabilities(): Float64Array {
    const p = new Float64Array(this.dim);
    for (let i = 0; i < this.dim; i++) p[i] = this.re[i] * this.re[i] + this.im[i] * this.im[i];
    return p;
  }

  norm2(): number {
    let s = 0;
    for (let i = 0; i < this.dim; i++) s += this.re[i] * this.re[i] + this.im[i] * this.im[i];
    return s;
  }

  /** Born probability that qubit q reads 1. */
  probOne(q: number): number {
    this.check(q);
    const bit = 1 << q;
    let s = 0;
    for (let i = 0; i < this.dim; i++) if (i & bit) s += this.re[i] * this.re[i] + this.im[i] * this.im[i];
    return s;
  }

  /** Projective collapse of qubit q onto value `bit`, followed by renormalisation. */
  collapse(q: number, bit: 0 | 1): this {
    this.check(q);
    const mask = 1 << q;
    let s = 0;
    for (let i = 0; i < this.dim; i++) {
      const v = (i & mask) ? 1 : 0;
      if (v !== bit) {
        this.re[i] = 0;
        this.im[i] = 0;
      } else s += this.re[i] * this.re[i] + this.im[i] * this.im[i];
    }
    if (s <= 1e-15) throw new Error(`Cannot collapse qubit ${q} onto zero-probability outcome ${bit}`);
    const k = 1 / Math.sqrt(s);
    for (let i = 0; i < this.dim; i++) {
      this.re[i] *= k;
      this.im[i] *= k;
    }
    return this;
  }

  /** Collapse the full register onto basis state `index` (after a full measurement). */
  collapseTo(index: number): this {
    if (this.re[index] * this.re[index] + this.im[index] * this.im[index] <= 1e-15)
      throw new Error(`Basis state ${index} has zero amplitude`);
    this.re.fill(0);
    this.im.fill(0);
    this.re[index] = 1;
    return this;
  }

  /** Purity Tr(rho_q^2) of the reduced single-qubit state of q (1 = pure / unentangled). */
  reducedPurity(q: number): number {
    const bit = 1 << q;
    let r00 = 0, r11 = 0, r01re = 0, r01im = 0;
    for (let i = 0; i < this.dim; i++) {
      if (i & bit) continue;
      const j = i | bit;
      const ar = this.re[i], ai = this.im[i], br = this.re[j], bi = this.im[j];
      r00 += ar * ar + ai * ai;
      r11 += br * br + bi * bi;
      // rho01 += a * conj(b)
      r01re += ar * br + ai * bi;
      r01im += ai * br - ar * bi;
    }
    return r00 * r00 + r11 * r11 + 2 * (r01re * r01re + r01im * r01im);
  }
}
