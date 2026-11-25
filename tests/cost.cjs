// Lifetime account cost simulator. Seam: PFMCost.lifetime(inputs) -> {ok, lines, total, ...} in dollars, rounded to cents.
const a = require("node:assert/strict"), C = require("../src/cost.js");
const base = { firstPrice: 49, renewalPrice: 109, months: 3, activation: 149, resets: 2, resetFee: 80, platformMonthly: 25, dataMonthly: 0, taxPct: 0, splitPct: 90 };
let r = C.lifetime(base);
a.ok(r.ok);
a.equal(r.evaluation, 49 + 2 * 109);          // first payment, then two renewals at the recurring price
a.equal(r.resetsCost, 160); a.equal(r.activation, 149); a.equal(r.tools, 75);
a.equal(r.subtotal, 267 + 160 + 149 + 75); a.equal(r.tax, 0); a.equal(r.total, 651);
a.equal(r.breakevenPayout, 651);                // cash you must receive to be even
a.equal(r.breakevenGross, 723.33);              // 651 / 0.90 gross payout request, rounded to cents
// tax is user-entered and applied to the subtotal only
r = C.lifetime({ ...base, taxPct: 8.25 }); a.equal(r.tax, 53.71); a.equal(r.total, 704.71);
// months = 1 means a single payment and no renewals
r = C.lifetime({ ...base, months: 1, resets: 0, activation: 0, platformMonthly: 0 }); a.equal(r.total, 49);
// renewal price blank: renewals cost the first price (no discount assumed), and the line says so
r = C.lifetime({ ...base, renewalPrice: "", resets: 0, activation: 0, platformMonthly: 0 }); a.equal(r.evaluation, 147);
// unknown split: breakeven gross is unknown, never guessed
r = C.lifetime({ ...base, splitPct: "" }); a.equal(r.breakevenGross, null);
// bad input is rejected with a reason, never silently zeroed
for (const bad of [{ firstPrice: -1 }, { months: 0 }, { months: 2.5 }, { resets: -1 }, { taxPct: 101 }, { splitPct: 120 }, { firstPrice: "abc" }]) {
  const x = C.lifetime({ ...base, ...bad }); a.equal(x.ok, false, JSON.stringify(bad)); a.ok(x.reason);
}
a.equal(C.lifetime({}).ok, false);
// cents: 0.1 + 0.2 style sums do not drift
r = C.lifetime({ firstPrice: 0.1, renewalPrice: 0.2, months: 2, activation: 0, resets: 0, resetFee: 0, platformMonthly: 0, dataMonthly: 0, taxPct: 0, splitPct: 100 }); a.equal(r.total, 0.3);
console.log("Lifetime cost checks passed");
