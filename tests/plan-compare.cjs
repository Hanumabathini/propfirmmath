// Plan journal math (PFM-29: rewritten against the current exports journal() and rules()). Expected values worked by hand.
const a = require('node:assert/strict'), PC = require('../src/plan-compare.js');
const day = (pnl, fee = 0) => ({ pnl, fee });
// 40% limit, net basis: best day 1200 of 2400 total = 50%, so 1200/0.40 = 3000 total is needed, i.e. 600 more.
let r = PC.journal([600, -300, 1200, 400, 500].map(p => day(p)), { pct: 40, basis: 'net', target: null }).pop();
a.equal(r.total, 2400); a.equal(r.ratio, 50); a.equal(r.ratioMet, false); a.equal(r.extra, 600); a.equal(r.count, 5);
// Gross basis adds commission back to each day: days become 110 and 110, best 110 of 220 = 50% <= 60%; displayed net total stays 200.
r = PC.journal([day(100, 10), day(100, 10)], { pct: 60, basis: 'gross', target: null }).pop();
a.equal(r.total, 200); a.equal(r.ratio, 50); a.equal(r.ratioMet, true); a.equal(r.extra, 0);
// Blank days are skipped, not counted as zero; one day of 100 at a 40% limit needs 250 total, 150 more.
let rows = PC.journal([day(100), day(null)], { pct: 40, basis: 'net', target: null });
a.equal(rows[1], null); a.equal(rows[0].extra, 150); a.equal(rows[0].count, 1);
// No consistency rule (pct 0) is always met.
a.equal(PC.journal([day(500), day(-100)], { pct: 0, basis: 'net', target: null }).pop().ratioMet, true);
// Unknown rule (pct null) is reported as unknown, never as met.
a.equal(PC.journal([day(500)], { pct: null, basis: 'net', target: null }).pop().ratioMet, null);
// Target remaining: 50K plan with a 6% target is 3000; 2400 made leaves 600.
a.equal(PC.rules({ name: 'X' }, { label: '50K Eval', target: '6%', consistency: 'At most 40%', days: '5' }).target, 3000);
r = PC.journal([600, 1800].map(p => day(p)), { pct: 40, basis: 'net', target: 3000 }).pop(); a.equal(r.remaining, 600);
console.log('Plan comparison math tests passed.');
