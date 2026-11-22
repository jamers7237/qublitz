"""PRISM: Parity-Resolved Intelligent Synthesis and Minimization.

Qublitz 2026, Quantum Circuit Golf submission.

The public interface is ``optimize(circuit, config)``.  No quantum SDK is
required by the optimizer: only NumPy and the Python standard library.

Three complementary, semantics-preserving ideas are used:
  * Affine parity tracking combines phase gates across intervening CNOT/X gates.
  * Cost-aware exact synthesis of short 1- and 2-qubit windows.
  * GF(2) elimination re-synthesizes purely affine (X/CNOT) windows.

Every returned nontrivial optimization is checked against the *entire* input
unitary (up to global phase).  The original is returned on any verification
failure.  This checker is independent of the optimizer's symbolic algebra.
"""

from __future__ import annotations

import copy
import itertools
import math
from functools import lru_cache

import numpy as np


ONE = ("H", "X", "Z", "S", "SDG", "T", "TDG")
PHASES = {"Z": 4, "S": 2, "SDG": -2, "T": 1, "TDG": -1}
ALLOWED = frozenset(ONE) | {"CX"}
SQRT2 = math.sqrt(2)
U1 = {
    "H": np.array([[1, 1], [1, -1]], complex) / SQRT2,
    "X": np.array([[0, 1], [1, 0]], complex),
    "Z": np.diag([1, -1]).astype(complex),
    "S": np.diag([1, 1j]).astype(complex),
    "SDG": np.diag([1, -1j]).astype(complex),
    "T": np.diag([1, np.exp(1j * np.pi / 4)]).astype(complex),
    "TDG": np.diag([1, np.exp(-1j * np.pi / 4)]).astype(complex),
}


def _op(name, *qubits):
    return {"gate": name, "qubits": list(qubits)}


def _validate(circuit, config):
    if not isinstance(circuit, dict) or set(circuit) != {"n_qubits", "gates"}:
        raise ValueError("Invalid circuit dictionary")
    n = circuit["n_qubits"]
    if type(n) is not int or not 1 <= n <= 6 or not isinstance(circuit["gates"], list):
        raise ValueError("Requires 1-6 qubits and a gate list")
    for g in circuit["gates"]:
        if not isinstance(g, dict) or set(g) != {"gate", "qubits"}:
            raise ValueError("Invalid gate dictionary")
        name, q = g["gate"], g["qubits"]
        if name not in ALLOWED or not isinstance(q, list) or len(q) != (2 if name == "CX" else 1):
            raise ValueError("Unsupported gate or arity")
        if any(type(k) is not int or k < 0 or k >= n for k in q) or len(set(q)) != len(q):
            raise ValueError("Invalid qubits")
    if not isinstance(config, dict) or set(config) != {"w1", "w2", "wd"}:
        raise ValueError("Invalid cost configuration")
    for key in ("w1", "w2", "wd"):
        v = config[key]
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0:
            raise ValueError("Weights must be finite nonnegative real numbers")
    if not any(config.values()):
        raise ValueError("At least one cost must be positive")


def metrics(gates, n):
    clock = [0] * n
    n1 = n2 = 0
    for g in gates:
        qs = g["qubits"]
        end = max(clock[q] for q in qs) + 1
        for q in qs:
            clock[q] = end
        if g["gate"] == "CX":
            n2 += 1
        else:
            n1 += 1
    return n1, n2, max(clock)


def cost(gates, n, config):
    n1, n2, depth = metrics(gates, n)
    return n1 * config["w1"] + n2 * config["w2"] + depth * config["wd"]


def _unitary(gates, n):
    """Fast full-unitary verifier, independent from phase-polynomial logic."""
    d = 1 << n
    result = np.eye(d, dtype=complex)
    indices = np.arange(d)
    for g in gates:
        name = g["gate"]
        if name == "CX":
            c, t = g["qubits"]
            cbit, tbit = 1 << (n - 1 - c), 1 << (n - 1 - t)
            selected = indices[(indices & cbit != 0) & (indices & tbit == 0)]
            paired = selected ^ tbit
            old = result[selected].copy()
            result[selected] = result[paired]
            result[paired] = old
        else:
            q = g["qubits"][0]
            bit = 1 << (n - 1 - q)
            lo = indices[(indices & bit) == 0]
            hi = lo | bit
            upper = result[lo].copy()
            lower = result[hi].copy()
            m = U1[name]
            result[lo] = m[0, 0] * upper + m[0, 1] * lower
            result[hi] = m[1, 0] * upper + m[1, 1] * lower
    return result


def _equal_unitaries(a, b):
    pos = np.unravel_index(np.argmax(np.abs(a)), a.shape)
    if abs(a[pos]) < 1e-12:
        return False
    phase = b[pos] / a[pos]
    return abs(abs(phase) - 1) < 1e-8 and np.allclose(b, a * phase, rtol=0, atol=1e-8)


def _key(matrix):
    """Numerical fingerprint invariant under global phase; confirmed before use."""
    flat = matrix.ravel()
    pivot = flat[np.argmax(np.abs(flat))]
    scaled = matrix * np.conjugate(pivot) / abs(pivot)
    nums = np.rint(np.stack((scaled.real, scaled.imag), -1).ravel() * 1e7)
    return tuple(nums.astype(np.int32))


def _phase_sequence(k, q):
    # Minimal phase gate words modulo 8, ignoring an irrelevant global phase.
    words = {0: (), 1: ("T",), 2: ("S",), 3: ("S", "T"),
             4: ("Z",), 5: ("SDG", "TDG"), 6: ("SDG",), 7: ("TDG",)}
    return [_op(name, q) for name in words[k % 8]]


def _phase_block(gates, n, mode=0):
    """Combine phases by the *input parity* they depend upon.

    Within a Hadamard-free segment, every wire is an affine Boolean function
    x -> parity(mask & x) XOR offset.  Phase gates do not change this function.
    An X-induced offset flips the phase coefficient modulo 8 (up to global
    phase); equivalent parities share coefficients even when separated by CX.
    """
    if not gates:
        return []
    linear = []
    rows = [1 << q for q in range(n)]
    offsets = [0] * n
    terms = {}
    for g in gates:
        name = g["gate"]
        if name in PHASES:
            q = g["qubits"][0]
            mask = rows[q]
            if mask:
                k = PHASES[name] * (-1 if offsets[q] else 1)
                terms[mask] = (terms.get(mask, 0) + k) % 8
        elif name == "X":
            q = g["qubits"][0]
            offsets[q] ^= 1
            linear.append(g)
        elif name == "CX":
            c, t = g["qubits"]
            rows[t] ^= rows[c]
            offsets[t] ^= offsets[c]
            linear.append(g)
        else:
            raise AssertionError("Only H-free segments may enter the phase collector")

    terms = {mask: k for mask, k in terms.items() if k}
    if not terms:
        return list(linear)

    # Locate every position at which each required input parity already exists.
    available = {mask: [] for mask in terms}
    rows = [1 << q for q in range(n)]
    offsets = [0] * n
    for position in range(len(linear) + 1):
        for q in range(n):
            mask = rows[q]
            if mask in available:
                available[mask].append((position, q, offsets[q]))
        if position == len(linear):
            break
        g = linear[position]
        if g["gate"] == "X":
            offsets[g["qubits"][0]] ^= 1
        else:
            c, t = g["qubits"]
            rows[t] ^= rows[c]
            offsets[t] ^= offsets[c]

    additions = [[] for _ in range(len(linear) + 1)]
    for mask, k in sorted(terms.items()):
        choices = available[mask]
        assert choices  # The original circuit necessarily computed this parity.
        if mode == 0:
            position, q, bit = choices[0]   # Earliest placement
        elif mode == 1:
            position, q, bit = choices[-1]  # Latest placement
        elif mode == 2:
            position, q, bit = choices[len(choices) // 2]
        else:
            position, q, bit = choices[(mask * 17 + mode * 73) % len(choices)]
        additions[position].extend(_phase_sequence(-k if bit else k, q))
    out = []
    for i in range(len(linear) + 1):
        out.extend(additions[i])
        if i < len(linear):
            out.append(linear[i])
    return out


def _phase_pass(gates, n, mode):
    result = []
    block = []
    for g in gates:
        if g["gate"] == "H":
            result.extend(_phase_block(block, n, mode))
            result.append(g)
            block = []
        else:
            block.append(g)
    result.extend(_phase_block(block, n, mode))
    return result


def _affine_synthesis(gates, n, reverse=False):
    """Synthesize an X/CNOT network as a GF(2) matrix plus a bit offset."""
    rows = [1 << i for i in range(n)]
    b = [0] * n
    for g in gates:
        if g["gate"] == "X":
            b[g["qubits"][0]] ^= 1
        else:
            c, t = g["qubits"]
            rows[t] ^= rows[c]
            b[t] ^= b[c]

    # Gaussian elimination on rows: E_k...E_1 A = I, so reversing the
    # elimination operations creates A in chronological circuit order.
    work = rows[:]
    elimination = []
    pivots = range(n - 1, -1, -1) if reverse else range(n)
    for col in pivots:
        if not (work[col] >> col) & 1:
            candidates = [i for i in range(n) if i != col and (work[i] >> col) & 1]
            if not candidates:
                return list(gates)
            donor = candidates[0]
            work[col] ^= work[donor]
            elimination.append(_op("CX", donor, col))
        for row in range(n):
            if row != col and (work[row] >> col) & 1:
                work[row] ^= work[col]
                elimination.append(_op("CX", col, row))
    if work != [1 << i for i in range(n)]:
        return list(gates)
    return list(reversed(elimination)) + [_op("X", i) for i, bit in enumerate(b) if bit]


def _affine_pass(gates, n, config):
    result = []
    block = []
    for g in list(gates) + [None]:
        if g is not None and g["gate"] in ("CX", "X"):
            block.append(g)
            continue
        if block:
            options = [block] + [_affine_synthesis(block, n, rev) for rev in (False, True)]
            block = min(options, key=lambda x: (cost(x, n, config), len(x)))
            result.extend(block)
            block = []
        if g is not None:
            result.append(g)
    return result


def _local_gate_names(qcount):
    options = [(name, (q,)) for q in range(qcount) for name in ONE]
    if qcount == 2:
        options.extend((("CX", (0, 1)), ("CX", (1, 0))))
    return options


@lru_cache(maxsize=2)
def _catalog(qcount):
    """Discover inexpensive exact gate words automatically, up to length 5/4.

    Keeps a small Pareto set (1q count, CX count, local depth) per unitary.
    The table comes from unitary enumeration; identities are not hard-coded.
    """
    operators = []
    for name, qs in _local_gate_names(qcount):
        g = _op(name, *qs)
        operators.append((g, _unitary([g], qcount)))
    identity = np.eye(1 << qcount, dtype=complex)
    catalog = {_key(identity): [((), (0, 0, 0), identity)]}
    frontier = [((), identity)]
    maximum_length = 5 if qcount == 1 else 4
    for _ in range(maximum_length):
        next_frontier = []
        seen_next = set()
        for seq, mat in frontier:
            for g, gate_mat in operators:
                extended = seq + ((g["gate"], *g["qubits"]),)
                # Immediate inverse-like pairs can never be Pareto-optimal.
                if len(extended) >= 2 and extended[-1] == extended[-2] and g["gate"] in ("H", "X", "Z", "CX"):
                    continue
                next_mat = gate_mat @ mat
                key = _key(next_mat)
                stats = metrics([_op(x[0], *x[1:]) for x in extended], qcount)
                candidates = catalog.setdefault(key, [])
                dominated = any(all(a <= b for a, b in zip(old_stats, stats)) for _, old_stats, _ in candidates)
                if not dominated:
                    candidates[:] = [old for old in candidates
                                     if not all(a <= b for a, b in zip(stats, old[1]))]
                    candidates.append((extended, stats, next_mat))
                # One representative per unitary at each fixed length; keeps
                # exploration bounded while retaining shorter Pareto variants.
                if key not in seen_next:
                    seen_next.add(key)
                    next_frontier.append((extended, next_mat))
        frontier = next_frontier
    return catalog


def _projections(gates, subset):
    """Maximal projected blocks; disjoint outside-wire gates are transparent."""
    chosen = set(subset)
    block = []
    for i, g in enumerate(gates):
        touched = set(g["qubits"])
        if touched & chosen:
            if touched <= chosen:
                block.append(i)
            else:
                if block:
                    yield block
                block = []
    if block:
        yield block


def _local_pass(gates, n, config, changes_limit=24):
    """Exact bounded-window replacement; accepts only globally cheaper circuits."""
    current = list(gates)
    current_cost = cost(current, n, config)
    subsets = [(i,) for i in range(n)] + list(itertools.combinations(range(n), 2))
    libraries = {1: _catalog(1), 2: _catalog(2)}
    for _ in range(changes_limit):
        best = None
        best_cost = current_cost
        for subset in subsets:
            catalog = libraries[len(subset)]
            local = {q: i for i, q in enumerate(subset)}
            for block in _projections(current, subset):
                for start in range(len(block)):
                    word = []
                    for end in range(start, min(len(block), start + 8)):
                        g = current[block[end]]
                        word.append(_op(g["gate"], *(local[q] for q in g["qubits"])))
                        if len(word) < 2:
                            continue
                        m = _unitary(word, len(subset))
                        for sequence, _, known_matrix in catalog.get(_key(m), ()):
                            if len(sequence) >= len(word) + 3:
                                continue
                            if not _equal_unitaries(m, known_matrix):
                                continue
                            replacement = [_op(s[0], *(subset[q] for q in s[1:])) for s in sequence]
                            selected = set(block[start:end + 1])
                            # Other-wire gates are unaffected and commute with
                            # the rewritten subcircuit on this subset.
                            idx = block[start]
                            trial = (current[:idx] + replacement +
                                     [old for j, old in enumerate(current[idx:], idx) if j not in selected])
                            new_cost = cost(trial, n, config)
                            if new_cost + 1e-10 < best_cost:
                                best_cost = new_cost
                                best = trial
        if best is None:
            break
        current, current_cost = best, best_cost
    return current


def optimize(circuit, config):
    """Return an equivalent cost-improving circuit; preserve all input objects.

    Each transformation stage is optional: the weighted cost never increases.
    The final full-unitary safety check makes incorrect rewrites non-scoring
    rather than dangerous.  Only the official eight gates are emitted.
    """
    _validate(circuit, config)
    n = circuit["n_qubits"]
    original = copy.deepcopy(circuit["gates"])
    best = original
    best_cost = cost(best, n, config)

    def consider(candidate):
        nonlocal best, best_cost
        candidate_cost = cost(candidate, n, config)
        if candidate_cost + 1e-10 < best_cost:
            best, best_cost = candidate, candidate_cost
            return True
        return False

    for _ in range(2):
        consider(_local_pass(best, n, config))
        consider(_affine_pass(best, n, config))
        for mode in range(5):
            phase_candidate = _phase_pass(best, n, mode)
            if cost(phase_candidate, n, config) <= best_cost + 1e-10:
                consider(_local_pass(phase_candidate, n, config, changes_limit=12))
            consider(phase_candidate)
        consider(_affine_pass(best, n, config))

    if best is original or best == original:
        return copy.deepcopy(circuit)

    # Strong guarantee on the public supported size (at most 64x64).
    if not _equal_unitaries(_unitary(original, n), _unitary(best, n)):
        return copy.deepcopy(circuit)
    return {"n_qubits": n, "gates": copy.deepcopy(best)}

