/* PropFirmMath funded-trader engine. Pure functions, used by the live pages and build.py. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PROP = factory();
})(this, function () {
  "use strict";
  var r2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { var n = Number(v); return isFinite(n) ? n : 0; };
  var ceilCent = function(n){ return Math.ceil(n*100-1e-8)/100; };
  var floorCent = function(n){ return Math.floor(n*100+1e-8)/100; };

  // Parse daily P/L into numbers. Ignores $, spaces and empty entries.
  // Entries may be separated by new lines, spaces, semicolons or commas.
  // "350,400,500" (commas only, on one line) is three days, never 350400500.
  // Thousands separators ("1,000" or Indian "1,00,000") are read as part of one
  // number only when entries are separated by new lines, spaces or semicolons,
  // or when the whole input is one $-prefixed or decimal amount ("$1,000").
  var GROUPED = /^[-+]?\$?(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3})(?:\.\d+)?$/;
  function toNum(s) { s = s.replace(/\$/g, ""); return s !== "" && isFinite(Number(s)) ? Number(s) : null; }
  function parseDays(text) {
    var t = String(text || "").trim(), out = [];
    if (t === "") return out;
    var commaOnly = !/[\s;]/.test(t);
    if (commaOnly && !(GROUPED.test(t) && /\$|\./.test(t))) {
      t.split(",").forEach(function (s) { var n = toNum(s); if (n !== null) out.push(n); });
      return out;
    }
    t.split(/[\s;]+/).forEach(function (tok) {
      tok = tok.replace(/^,+|,+$/g, "");
      if (tok === "") return;
      if (GROUPED.test(tok)) { var g = toNum(tok.replace(/,/g, "")); if (g !== null) out.push(g); return; }
      tok.split(",").forEach(function (s) { var n = toNum(s); if (n !== null) out.push(n); });
    });
    return out;
  }

  // Consistency rule: the best day may be at most rulePct % of total profit.
  function consistency(days, rulePct) {
    rulePct = num(rulePct);
    var total = 0, best = 0, bestIdx = -1;
    days.forEach(function (d, i) { total += d; if (d > best) { best = d; bestIdx = i; } });
    var pct = total > 0 ? best / total * 100 : null;
    var limit = total > 0 ? total * rulePct / 100 : 0;
    var needTotal = rulePct > 0 ? best / (rulePct / 100) : 0;
    return {
      days: days.length, total: r2(total), best: r2(best), bestDay: bestIdx + 1,
      pct: pct === null ? null : r2(pct), rulePct: rulePct,
      pass: total > 0 && best > 0 && pct <= rulePct + 1e-9,
      maxBestDay: r2(limit),
      moreProfit: ceilCent(Math.max(0, needTotal - total))
    };
  }

  // Payout: what can come out of the account and what reaches you after the split.
  // floor = the balance that must stay in the account (start balance plus any buffer or safety net).
  function payout(x) {
    var balance = num(x.balance), floor = num(x.start) + num(x.buffer);
    var available = Math.max(0, balance - floor);
    var capped = x.maxPayout > 0 ? Math.min(available, num(x.maxPayout)) : available;
    // Some firms also cap one request at a share of the balance (e.g. 50%).
    if (x.maxPct > 0) capped = Math.min(capped, Math.max(0, balance) * num(x.maxPct) / 100);
    var request = floorCent(x.request > 0 ? Math.min(num(x.request), capped) : capped);
    var minOk = !(x.minPayout > 0) || request >= num(x.minPayout);
    // Reject impossible (>100%) firm splits rather than displaying a negative firm share.
    var split = Math.max(0, Math.min(100, num(x.split)));
    var gross = minOk ? request : 0;
    return {
      floor: r2(floor), available: r2(available), capped: r2(capped), request: r2(request),
      minOk: minOk, gross: r2(gross), firmShare: r2(gross - r2(gross * split / 100)),
      receive: r2(gross * split / 100), after: r2(balance - gross)
    };
  }

  // Drawdown: where the account fails and how much room is left.
  // type: "static" | "eod" | "intraday". lockAt: the level the trailing threshold stops at (0 = never stops).
  function drawdown(x) {
    var start = num(x.start), dd = num(x.amount), cur = num(x.balance);
    var peak = Math.max(start, num(x.peak), x.type === "intraday" ? cur : 0);
    var level;
    if (x.type === "static") level = start - dd;
    else {
      level = peak - dd;
      if (x.lockAt > 0) level = Math.min(level, num(x.lockAt));
    }
    var locked = x.type !== "static" && x.lockAt > 0 && peak - dd >= num(x.lockAt);
    return {
      peak: r2(peak), level: r2(level), room: r2(cur - level), locked: locked,
      toLock: x.type === "static" || !(x.lockAt > 0) || locked ? 0 : r2(num(x.lockAt) + dd - peak)
    };
  }

  // Profit target planner, with an optional consistency cap on any one day.
  function targetPlan(x) {
    var target = num(x.target), have = num(x.current), days = Math.max(0, Math.floor(num(x.days)));
    var left = Math.max(0, target - have);
    var rule = num(x.rulePct), best = Math.max(0, num(x.bestDay));
    // With a consistency rule the finished total must be at least best/rule.
    var finishAt = rule > 0 ? Math.max(target, have, ceilCent(best / (rule / 100))) : Math.max(target, have);
    var leftRule = Math.max(0, finishAt - have);
    var dayCap = rule > 0 ? floorCent(finishAt * rule / 100) : null;
    var minDays = dayCap ? Math.ceil(leftRule / dayCap - 1e-9) : (leftRule > 0 ? 1 : 0);
    if (x.minDays > 0) minDays = Math.max(minDays, num(x.minDays) - Math.max(0, Math.floor(num(x.tradedDays))));
    return {
      left: r2(left), finishAt: r2(finishAt), leftRule: r2(leftRule),
      perDay: days > 0 ? ceilCent(leftRule / days) : null, dayCap: dayCap === null ? null : r2(dayCap),
      minDays: Math.max(0, minDays), fits: days > 0 ? days >= minDays : null
    };
  }

  // CME contract specs: tick size in points and dollar value of one tick.
  var CONTRACTS = {
    ES: ["E-mini S&P 500", 0.25, 12.5], MES: ["Micro E-mini S&P 500", 0.25, 1.25],
    NQ: ["E-mini Nasdaq-100", 0.25, 5], MNQ: ["Micro E-mini Nasdaq-100", 0.25, 0.5],
    YM: ["E-mini Dow", 1, 5], MYM: ["Micro E-mini Dow", 1, 0.5],
    RTY: ["E-mini Russell 2000", 0.1, 5], M2K: ["Micro E-mini Russell 2000", 0.1, 0.5],
    CL: ["Crude Oil", 0.01, 10], MCL: ["Micro Crude Oil", 0.01, 1],
    GC: ["Gold", 0.1, 10], MGC: ["Micro Gold", 0.1, 1]
  };
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; };

  function positionSize(x) {
    var c = own(CONTRACTS, x.symbol);
    if (!c) throw new Error("Unknown contract");
    var ticks = x.unit === "ticks" ? num(x.stop) : num(x.stop) / c[1];
    ticks = Math.ceil(ticks - 1e-9);
    var perContract = ticks * c[2];
    var n = perContract > 0 ? Math.max(0, Math.floor(num(x.risk) / perContract + 1e-9)) : 0;
    if (x.maxContracts > 0) n = Math.min(n, Math.floor(num(x.maxContracts)));
    return {
      name: c[0], tickSize: c[1], tickValue: c[2], pointValue: r2(c[2] / c[1]), ticks: r2(ticks),
      perContract: r2(perContract), contracts: n, risk: r2(n * perContract)
    };
  }

  return { r2: r2, parseDays: parseDays, consistency: consistency, payout: payout, drawdown: drawdown,
           targetPlan: targetPlan, positionSize: positionSize, CONTRACTS: CONTRACTS };
});
