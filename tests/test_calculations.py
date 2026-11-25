"""Regression tests for the funded futures math engine. Run: python3 -m unittest discover -s tests."""
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def run(function, values):
    code = "const p=require(process.argv[1]); const fn=process.argv[2]; const x=JSON.parse(process.argv[3]); console.log(JSON.stringify(p[fn](...x)));"
    r = subprocess.run(["node", "-e", code, str(ROOT / "src/prop.js"), function, json.dumps(values)],
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)

class PropFirmCalculations(unittest.TestCase):
    def test_consistency(self):
        self.assertTrue(run("consistency", [[400, 300, 200], 50])["pass"])
        x = run("consistency", [[800, 100], 50])
        self.assertFalse(x["pass"])
        self.assertEqual(x["moreProfit"], 700)

    def test_payout(self):
        x = run("payout", [{"balance":53500, "start":50000, "buffer":500, "maxPayout":2000, "minPayout":125, "split":90}])
        self.assertEqual((x["available"], x["gross"], x["receive"], x["after"]), (3000, 2000, 1800, 51500))

    def test_trailing_drawdown(self):
        x = run("drawdown", [{"type":"eod", "start":50000, "amount":2000, "peak":51200,
                               "balance":50700, "lockAt":50000}])
        self.assertEqual((x["level"], x["room"]), (49200, 1500))

    def test_profit_target(self):
        x = run("targetPlan", [{"target":3000, "current":1200, "days":5}])
        self.assertEqual(x["perDay"], 360)

    def test_position_size(self):
        x = run("positionSize", [{"symbol":"ES", "stop":10, "unit":"points", "risk":500}])
        self.assertEqual((x["perContract"], x["contracts"]), (500, 1))

if __name__ == "__main__":
    unittest.main()
