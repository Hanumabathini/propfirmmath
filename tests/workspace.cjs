// Phase 0 regression tests: payout presets, tier changes, downgrade, bulk journal, import/restore, empty firm list.
const a = require("node:assert/strict"), P = require("../src/prop.js"), C = require("../src/workspace-core.js"), D = require("../data/prop.json");
const limits = { free: 1, pro: 10, elite: 25 };
const sum = (xs, k) => xs.reduce((n, e) => n + Number(e[k] || 0), 0);

// Critical 1: every payout preset must carry its own balance and give the written expected payout.
const expected = {
  "Topstep 50K funded, Standard path": 1575,      // funded balance starts at $0, so $3,500 profit: 50% cap = $1,750, split 90% = $1,575
  "Topstep 50K funded, Consistency path": 1575,
  "Topstep 150K funded, Standard path": 3600,     // $8,000 balance: 50% cap = $4,000, split 90% = $3,600
  "Tradeify Select Daily 50K": 1125,              // $53,500 - ($50,000 + $2,100 buffer) = $1,400, capped at $1,250, 90% = $1,125
  "MyFundedFutures Builder 50K": 1120,            // $1,400 available, 80% = $1,120
  "MyFundedFutures Rapid 50K": 1260               // $1,400 available, no cap, 90% = $1,260
};
let seen = 0;
Object.values(D.firms).forEach(f => ((f.presets || {}).payout || []).forEach(([label, v]) => {
  a.ok(Number(v.balance) > 0, label + " preset must set an account balance");
  a.equal(P.payout(v).receive, expected[label], label); seen++;
}));
a.equal(seen, Object.keys(expected).length);

// Build a full Elite-sized workspace: 25 accounts, 5 journal entries, a $900 payout and a $150 expense.
const full = C.empty(); full.tier = "elite";
for (let i = 0; i < 25; i++) full.accounts.push({ id: "a" + i, name: "Acct " + i, firm: "Topstep", plan: "50K", stage: "Evaluation", archived: false });
for (let i = 0; i < 5; i++) full.entries.push({ account: "a" + i, date: "2026-11-0" + (i + 1), pnl: 100 * (i + 1), note: "" });
full.cash.push({ type: "Payouts", account: "a0", date: "2026-11-20", amount: 900, note: "" }, { type: "Expenses", account: "a0", date: "2026-11-21", amount: 150, note: "" });
const before = JSON.stringify(full);

// Critical 2: exploring or switching a tier never deletes, edits or re-seeds records, and always returns a backup.
const up = C.changeTier(full, limits, "elite");
a.ok(up.ok); a.equal(JSON.stringify(up.state), before); a.equal(JSON.stringify(up.backup.state), before);
a.equal(JSON.stringify(full), before, "the original workspace object is not mutated");
const reload = JSON.parse(JSON.stringify(up.state)); // what a reload reads back from storage
a.equal(reload.accounts.length, 25); a.equal(reload.entries.length, 5); a.equal(sum(reload.cash.filter(e => e.type === "Payouts"), "amount"), 900); a.equal(sum(reload.cash.filter(e => e.type === "Expenses"), "amount"), 150);
a.equal(C.validState({ tier: "pro" }, limits), false, "a half-written save is not treated as a workspace");
a.equal(C.validState(reload, limits), true);

// High 3: a downgrade over the limit is refused without touching anything; once enough accounts are archived it works and keeps every record.
const refused = C.changeTier(full, limits, "free");
a.equal(refused.ok, false); a.equal(JSON.stringify(refused.state), before); a.equal(refused.backup, null);
const trimmed = JSON.parse(before); trimmed.accounts.forEach((x, i) => { if (i > 0) x.archived = true; });
const down = C.changeTier(trimmed, limits, "free");
a.ok(down.ok); a.equal(down.state.accounts.length, 25); a.equal(down.state.entries.length, 5); a.equal(down.state.cash.length, 2);

// High 4: bulk entries detect existing dates, skip them by default, and overwrite only when asked.
const day = "2026-11-02"; // a1 already has 200 on this date
const ids = ["a0", "a1", "a2"];
const plan = C.bulkPlan(full.entries, ids, day);
a.deepEqual(plan.conflicts, ["a1"]); a.deepEqual(plan.add, ["a0", "a2"]);
const skip = C.applyBulk(full.entries, ids, day, 999, "bulk", "skip");
a.equal(skip.added, 2); a.equal(skip.skipped, 1); a.equal(skip.overwritten, 0);
a.equal(skip.entries.find(e => e.account === "a1" && e.date === day).pnl, 200, "existing entry kept");
a.equal(full.entries.find(e => e.account === "a1" && e.date === day).pnl, 200, "input not mutated");
const over = C.applyBulk(full.entries, ids, day, 999, "bulk", "overwrite");
a.equal(over.overwritten, 1); a.equal(over.entries.find(e => e.account === "a1" && e.date === day).pnl, 999);

// Restore: JSON export re-imports with identical totals; CSV journal round trips and previews skips.
const imp = C.parseJsonImport(JSON.stringify(full), limits);
a.ok(imp.ok); a.deepEqual(imp.counts, { accounts: 25, entries: 5, cash: 2 }); a.equal(sum(imp.state.entries, "pnl"), sum(full.entries, "pnl"));
a.equal(C.parseJsonImport("not json", limits).ok, false); a.equal(C.parseJsonImport('{"tier":"gold"}', limits).ok, false);
const csv = C.journalCsv(full), empty = C.empty(); empty.accounts = full.accounts.map(x => ({ ...x }));
const prev = C.journalCsvPreview(csv, empty);
a.ok(prev.ok); a.equal(prev.rows.length, 5); a.equal(prev.add, 5); a.equal(prev.conflicts, 0);
const restored = C.applyJournalRows(empty.entries, prev.rows, "skip");
a.equal(restored.entries.length, 5); a.equal(sum(restored.entries, "pnl"), sum(full.entries, "pnl"));
const again = C.journalCsvPreview(csv, { ...empty, entries: restored.entries });
a.equal(again.conflicts, 5); a.equal(C.applyJournalRows(restored.entries, again.rows, "skip").skipped, 5);
a.equal(C.journalCsvPreview("wrong,header\n1,2", empty).ok, false);
a.equal(C.journalCsvPreview(csv.replace("2026-11-01", "bad-date"), empty).badLines.length, 1);

// High 2: the empty firm list names the country and points to the directory.
a.match(C.emptyFirmMessage("Pakistan"), /Pakistan/); a.match(C.emptyFirmMessage("Pakistan"), /directory/);

console.log("Workspace regression checks passed");
