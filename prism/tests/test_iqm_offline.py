"""Offline IQM math checks; Qiskit and a device token are NOT needed."""

import math
import unittest

from run_experiments import cases
from iqm_emerald_demo import ideal_probabilities, total_variation


class HardwarePreparationMathTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.gauntlet = next(c["circuit"] for c in cases()
                            if c["name"] == "L3-parity-gauntlet-49-to-1")

    def test_plain_input_cannot_reveal_t_phase(self):
        self.assertAlmostEqual(ideal_probabilities(self.gauntlet)["0000"], 1., places=10)

    def test_hth_phase_probe_exposes_difference(self):
        probs = ideal_probabilities(self.gauntlet, probe_qubit=1)
        expected = (1 - math.cos(math.pi / 4)) / 2
        self.assertAlmostEqual(probs["0100"], expected, places=10)
        self.assertAlmostEqual(probs["0000"], 1 - expected, places=10)
        self.assertAlmostEqual(sum(probs.values()), 1, places=10)

    def test_total_variation_bounds(self):
        ideal = {"0": .75, "1": .25}
        self.assertAlmostEqual(total_variation({"0": 75, "1": 25}, ideal, 100), 0)
        self.assertAlmostEqual(total_variation({"0": 100}, ideal, 100), .25)


if __name__ == "__main__":
    unittest.main()
