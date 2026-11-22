"""Independent regression and randomized-property tests for PRISM.

Run from repository root: python -m unittest discover -s tests -v
"""

import copy
import random
import unittest

import numpy as np

from submission import ONE, _equal_unitaries, _unitary, cost, optimize


WEIGHTS = (
    {"w1": 1.0, "w2": 6.0, "wd": 0.2},
    {"w1": 0.0, "w2": 1.0, "wd": 0.0},
    {"w1": 1.0, "w2": 0.0, "wd": 0.0},
    {"w1": 0.0, "w2": 0.0, "wd": 1.0},
    {"w1": 3.0, "w2": 1.0, "wd": 5.0},
)


def g(name, *qs):
    return {"gate": name, "qubits": list(qs)}


def circuit(n, *gates):
    return {"n_qubits": n, "gates": list(gates)}


class TestCorrectness(unittest.TestCase):
    def assertSafe(self, original, weight):
        frozen = copy.deepcopy((original, weight))
        result = optimize(original, weight)
        self.assertEqual((original, weight), frozen)
        self.assertEqual(result["n_qubits"], original["n_qubits"])
        self.assertTrue(_equal_unitaries(_unitary(original["gates"], original["n_qubits"]),
                                         _unitary(result["gates"], result["n_qubits"])))
        self.assertLessEqual(cost(result["gates"], result["n_qubits"], weight),
                             cost(original["gates"], original["n_qubits"], weight) + 1e-8)
        return result

    def test_documented_nonadjacent_cancellation(self):
        c = circuit(2, g("CX", 0, 1), g("Z", 0), g("CX", 0, 1))
        for weights in WEIGHTS:
            result = self.assertSafe(c, weights)
            self.assertTrue(len(result["gates"]) <= 3)
        self.assertEqual(self.assertSafe(c, WEIGHTS[0])["gates"], [g("Z", 0)])

    def test_affine_parity_cancellation(self):
        # The CNOT affecting q2 cannot change the parity stored on q1.
        c = circuit(3, g("CX", 0, 1), g("T", 1), g("CX", 1, 2),
                    g("TDG", 1), g("CX", 1, 2), g("CX", 0, 1))
        result = self.assertSafe(c, WEIGHTS[0])
        self.assertEqual(result["gates"], [])

    def test_affine_offset_and_global_phase(self):
        c = circuit(2, g("X", 0), g("T", 0), g("X", 0), g("T", 0))
        result = self.assertSafe(c, WEIGHTS[0])
        self.assertEqual(result["gates"], [])

    def test_hadamard_conjugation(self):
        c = circuit(2, g("H", 0), g("X", 0), g("H", 0))
        self.assertEqual(self.assertSafe(c, WEIGHTS[0])["gates"], [g("Z", 0)])

    def test_weight_dependent_choice(self):
        c = circuit(2, g("CX", 0, 1), g("Z", 1), g("CX", 0, 1))
        cheap_cx_expensive_1q = {"w1": 10.0, "w2": 1.0, "wd": 0.2}
        a = self.assertSafe(c, WEIGHTS[0])
        b = self.assertSafe(c, cheap_cx_expensive_1q)
        self.assertNotEqual(a["gates"], b["gates"])
        self.assertLess(len(a["gates"]), len(b["gates"]))

    def test_nonlocal_parity_fingerprint(self):
        from submission import _local_pass, _phase_pass
        from pathlib import Path
        import json
        examples = json.loads((Path(__file__).parents[1] / "experiments" / "circuits.json").read_text())
        c = next(ex["circuit"] for ex in examples if ex["name"] == "L3-nonlocal-parity-fingerprint")
        local = _local_pass(c["gates"], 4, WEIGHTS[0])
        parity = _phase_pass(c["gates"], 4, 0)
        self.assertLess(cost(parity, 4, WEIGHTS[0]), cost(local, 4, WEIGHTS[0]))
        self.assertSafe(c, WEIGHTS[0])

    def test_parity_gauntlet_49_to_1(self):
        from run_experiments import cases
        c = next(ex["circuit"] for ex in cases() if ex["name"] == "L3-parity-gauntlet-49-to-1")
        self.assertEqual(len(c["gates"]), 49)
        result = self.assertSafe(c, WEIGHTS[0])
        self.assertEqual(result["gates"], [g("T", 1)])

    def test_all_zero_weight_except_one(self):
        c = circuit(1, g("S", 0), g("S", 0), g("S", 0), g("S", 0))
        for weight in WEIGHTS:
            self.assertSafe(c, weight)

    def test_identity_and_one_to_six_qubits(self):
        for n in range(1, 7):
            self.assertEqual(self.assertSafe(circuit(n), WEIGHTS[0])["gates"], [])

    def test_randomized_adversarial_inputs(self):
        rng = random.Random(20261121)
        for n in range(1, 7):
            for trial in range(12):
                gates = []
                for _ in range(rng.randrange(6, 35)):
                    if n > 1 and rng.random() < .42:
                        q, r = rng.sample(range(n), 2)
                        gates.append(g("CX", q, r))
                    else:
                        gates.append(g(rng.choice(ONE), rng.randrange(n)))
                # Occasionally force a hidden identity surrounded by noise.
                if trial % 3 == 0:
                    q = rng.randrange(n)
                    gates += [g("H", q), g("H", q)]
                self.assertSafe(circuit(n, *gates), WEIGHTS[trial % len(WEIGHTS)])

    def test_phase_collector_alone_randomized(self):
        from submission import _phase_pass
        rng = random.Random(1987)
        for n in range(1, 7):
            for _ in range(50):
                gates = []
                for __ in range(rng.randrange(1, 40)):
                    if n > 1 and rng.random() < 0.4:
                        gates.append(g("CX", *rng.sample(range(n), 2)))
                    else:
                        gates.append(g(rng.choice(("X", "S", "SDG", "T", "TDG", "Z")), rng.randrange(n)))
                a = _unitary(gates, n)
                for mode in range(5):
                    transformed = _phase_pass(gates, n, mode)
                    self.assertTrue(_equal_unitaries(a, _unitary(transformed, n)),
                                    f"n={n}, mode={mode}, gates={gates}")

    def test_affine_synth_alone_randomized(self):
        from submission import _affine_synthesis
        rng = random.Random(1717)
        for n in range(1, 7):
            for _ in range(50):
                gates = []
                for __ in range(rng.randrange(1, 40)):
                    if n > 1 and rng.random() < 0.8:
                        gates.append(g("CX", *rng.sample(range(n), 2)))
                    else:
                        gates.append(g("X", rng.randrange(n)))
                a = _unitary(gates, n)
                for rev in (False, True):
                    transformed = _affine_synthesis(gates, n, rev)
                    self.assertTrue(_equal_unitaries(a, _unitary(transformed, n)),
                                    f"n={n}, reverse={rev}, gates={gates}")


if __name__ == "__main__":
    unittest.main()

