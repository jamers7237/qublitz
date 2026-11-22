/**
 * The hidden bedroom-route cipher.
 * Entering the LEFT bedroom writes 0, the RIGHT bedroom writes 1.
 * Pulling the brass lever commits the buffer as a positive binary address 1..8.
 * A route that begins with L (leading zero, including the bare "L" = 0) is invalid
 * and yields only a muted mechanical knock.
 */
export const MAX_ROUTE_LENGTH = 6;
export const MAX_ADDRESS = 8;

export type RouteResult =
  | { kind: 'empty' }
  | { kind: 'zero' } // begins with L: leading zero / address 0
  | { kind: 'invalid'; value: number } // > 8 or too long
  | { kind: 'address'; address: number };

export function parseRoute(route: string): RouteResult {
  const r = normalizeRoute(route);
  if (r.length === 0) return { kind: 'empty' };
  if (r[0] === 'L') return { kind: 'zero' };
  const value = parseInt(r.replace(/L/g, '0').replace(/R/g, '1'), 2);
  if (value < 1 || value > MAX_ADDRESS) return { kind: 'invalid', value };
  return { kind: 'address', address: value };
}

export const addressToRoute = (address: number): string => address.toString(2).replace(/0/g, 'L').replace(/1/g, 'R');

/** Accepts "R,L", "r l", "RL", "right left" -> "RL". */
export function normalizeRoute(input: string): string {
  const s = input.toUpperCase().replace(/RIGHT/g, 'R').replace(/LEFT/g, 'L');
  return s.replace(/[^LR]/g, '');
}

export const prettyRoute = (route: string): string => normalizeRoute(route).split('').join('·') || '—';

/** Appends a bedroom symbol; keeps the buffer bounded so it can never grow forever. */
export function appendRoute(route: string, symbol: 'L' | 'R'): string {
  const next = route + symbol;
  return next.length > MAX_ROUTE_LENGTH ? next.slice(next.length - MAX_ROUTE_LENGTH) : next;
}
