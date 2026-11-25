/* PropFirmMath workspace safety logic. Pure functions, used by membership.js and tested in tests/workspace.cjs.
   Nothing here touches the DOM or storage, so a tier change, a bulk entry or an import can be tested without a browser. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PFMCore = factory();
})(this, function () {
  "use strict";
  var empty = function () { return { tier: "free", accounts: [], entries: [], cash: [] }; };
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };

  // A saved workspace is only accepted when its shape is complete.
  function validState(raw, limits) {
    return !!raw && typeof raw === "object" && Object.prototype.hasOwnProperty.call(limits, raw.tier) &&
      Array.isArray(raw.accounts) && Array.isArray(raw.entries) && Array.isArray(raw.cash);
  }

  // Which of the chosen accounts already have a journal entry for this date.
  function bulkPlan(entries, accountIds, date) {
    var have = {};
    entries.forEach(function (e) { if (e.date === date) have[e.account] = true; });
    var plan = { add: [], conflicts: [] };
    accountIds.forEach(function (id) { (have[id] ? plan.conflicts : plan.add).push(id); });
    return plan;
  }

  // Save one result for several accounts. Default mode "skip" never changes an existing entry.
  function applyBulk(entries, accountIds, date, pnl, note, mode) {
    var out = clone(entries), added = 0, skipped = 0, overwritten = 0;
    accountIds.forEach(function (id) {
      var old = out.find(function (e) { return e.account === id && e.date === date; });
      if (!old) { out.push({ account: id, date: date, pnl: pnl, note: note }); added++; }
      else if (mode === "overwrite") { old.pnl = pnl; old.note = note; overwritten++; }
      else skipped++;
    });
    return { entries: out, added: added, skipped: skipped, overwritten: overwritten };
  }

  // Switching or exploring a tier never edits records. It refuses only when more accounts are active than the tier allows,
  // and it always hands back a backup of the workspace as it was.
  function changeTier(state, limits, target) {
    if (!Object.prototype.hasOwnProperty.call(limits, target)) return { ok: false, reason: "Unknown membership tier.", state: state, backup: null };
    var active = state.accounts.filter(function (a) { return !a.archived; }).length;
    if (active > limits[target]) return { ok: false, reason: "Archive extra accounts before switching to this tier. Nothing was changed or deleted.", state: state, backup: null };
    var backup = { at: new Date().toISOString(), reason: "Before switching to " + target, state: clone(state) };
    var next = clone(state); next.tier = target;
    return { ok: true, reason: "", state: next, backup: backup };
  }

  // JSON restore. Returns a preview before anything is written.
  function parseJsonImport(text, limits) {
    var raw; try { raw = JSON.parse(text); } catch (e) { return { ok: false, reason: "That file is not valid JSON." }; }
    if (!validState(raw, limits)) return { ok: false, reason: "That file is not a PropFirmMath workspace export." };
    return { ok: true, state: raw, counts: { accounts: raw.accounts.length, entries: raw.entries.length, cash: raw.cash.length } };
  }

  function csvCell(v) { v = v === undefined || v === null ? "" : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function csvLine(cells) { return cells.map(csvCell).join(","); }
  function splitCsv(line) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
    }
    out.push(cur); return out;
  }

  function journalCsv(state) {
    var name = {}; state.accounts.forEach(function (a) { name[a.id] = a.name; });
    return [csvLine(["account", "date", "pnl", "note"])].concat(state.entries.map(function (e) { return csvLine([name[e.account] || e.account, e.date, e.pnl, e.note]); })).join("\n");
  }
  function cashCsv(state) {
    var name = {}; state.accounts.forEach(function (a) { name[a.id] = a.name; });
    return [csvLine(["type", "account", "date", "amount", "note"])].concat(state.cash.map(function (e) { return csvLine([e.type, name[e.account] || e.account, e.date, e.amount, e.note]); })).join("\n");
  }

  // CSV journal import: account nickname, date, pnl, note. Matches accounts by nickname. Shows what would be added, skipped or overwritten.
  function journalCsvPreview(text, state) {
    var lines = String(text || "").split(/\r?\n/).filter(function (l) { return l.trim() !== ""; });
    var head = lines.length ? splitCsv(lines[0]).map(function (s) { return s.trim().toLowerCase(); }) : [];
    if (head.join(",") !== "account,date,pnl,note") return { ok: false, reason: "Expected the header: account,date,pnl,note" };
    var byName = {}; state.accounts.forEach(function (a) { byName[a.name] = a.id; });
    var rows = [], bad = [];
    lines.slice(1).forEach(function (l, i) {
      var c = splitCsv(l), id = byName[c[0]], pnl = Number(c[2]);
      if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(c[1] || "") || c[2] === "" || !isFinite(pnl)) bad.push(i + 2);
      else rows.push({ account: id, date: c[1], pnl: pnl, note: (c[3] || "").slice(0, 500) });
    });
    var add = 0, conflicts = 0;
    rows.forEach(function (r) { if (state.entries.some(function (e) { return e.account === r.account && e.date === r.date; })) conflicts++; else add++; });
    return { ok: true, rows: rows, badLines: bad, add: add, conflicts: conflicts };
  }
  function applyJournalRows(entries, rows, mode) {
    var out = clone(entries), added = 0, skipped = 0, overwritten = 0;
    rows.forEach(function (r) {
      var old = out.find(function (e) { return e.account === r.account && e.date === r.date; });
      if (!old) { out.push(clone(r)); added++; }
      else if (mode === "overwrite") { old.pnl = r.pnl; old.note = r.note; overwritten++; }
      else skipped++;
    });
    return { entries: out, added: added, skipped: skipped, overwritten: overwritten };
  }

  // Shown when no verified firm is listed for the chosen country.
  function emptyFirmMessage(countryName) {
    return "No verified firm with a sourced plan is currently listed for " + (countryName || "your selection") +
      ". That does not mean none accept you. Open the full directory to see each firm with its availability marked, and confirm eligibility with the firm.";
  }

  return { empty: empty, validState: validState, bulkPlan: bulkPlan, applyBulk: applyBulk, changeTier: changeTier,
           parseJsonImport: parseJsonImport, journalCsv: journalCsv, cashCsv: cashCsv, journalCsvPreview: journalCsvPreview,
           applyJournalRows: applyJournalRows, emptyFirmMessage: emptyFirmMessage };
});
