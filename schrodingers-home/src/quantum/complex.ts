/** Minimal complex-number helpers used to describe gate matrices. */
export interface Complex {
  re: number;
  im: number;
}

export const c = (re: number, im = 0): Complex => ({ re, im });
export const cadd = (a: Complex, b: Complex): Complex => c(a.re + b.re, a.im + b.im);
export const cmul = (a: Complex, b: Complex): Complex =>
  c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const cconj = (a: Complex): Complex => c(a.re, -a.im);
export const cabs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
export const fmtComplex = (a: Complex, digits = 4): string => {
  const re = a.re.toFixed(digits);
  if (Math.abs(a.im) < 1e-12) return re;
  return `${re}${a.im >= 0 ? '+' : '-'}${Math.abs(a.im).toFixed(digits)}i`;
};
