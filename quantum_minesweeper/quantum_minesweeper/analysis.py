"""Raw-count analysis. No postselection and no use of error labels in decoding."""
from math import sqrt
from .codes import TYPE, COMPACT_LOCATION, EXPLICIT_LOCATION, expected_syndrome


def wilson(success, total):
    if total <= 0:
        raise ValueError("counts must contain shots")
    z = 1.959963984540054
    p = success / total
    d = 1 + z * z / total
    c = (p + z * z / (2 * total)) / d
    h = z * sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / d
    return [max(0.0, c - h), min(1.0, c + h)]


def decode_key(key, width):
    bits = str(key).replace(" ", "")
    if len(bits) != width or set(bits) - {"0", "1"}:
        raise ValueError(f"expected {width}-bit Qiskit count key, got {key!r}")
    return tuple(int(x) for x in reversed(bits))


def analyze(experiment, counts):
    level = experiment.level
    expected = expected_syndrome(level, experiment.error, experiment.mode)
    total, syndrome_ok, logical_ok, joint_ok = 0, 0, 0, 0
    histogram = {}
    for key, n in counts.items():
        if not isinstance(n, int) or n < 0:
            raise ValueError("counts must be nonnegative integers")
        bits = decode_key(key, 2 if level == 4 else 3)
        syndrome = bits if level == 4 else bits[1:]
        label = TYPE[syndrome] if level == 4 else str(
            (COMPACT_LOCATION if experiment.mode == "compact" else EXPLICIT_LOCATION)[syndrome])
        histogram[label] = histogram.get(label, 0) + n
        total += n
        syndrome_ok += n * (syndrome == expected)
        if level != 4:
            logical_ok += n * (bits[0] == 0)
            joint_ok += n * (bits[0] == 0 and syndrome == expected)
    result = {"shots": total, "syndrome_accuracy": syndrome_ok / total if total else 0,
              "syndrome_ci95": wilson(syndrome_ok, total), "decoded_syndrome_counts": histogram}
    if level != 4:
        result.update(logical_fidelity_estimate=logical_ok / total,
                      logical_ci95=wilson(logical_ok, total), joint_success=joint_ok / total)
    return result
