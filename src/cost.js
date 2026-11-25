/* PropFirmMath lifetime account cost. Pure, cent-exact. Every number is user-entered; nothing is assumed except that a blank renewal price means "same as the first price". */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PFMCost = factory();
})(this, function () {
  "use strict";
  var blank = function (v) { return v === undefined || v === null || String(v).trim() === ""; };
  function num(v, name, opt, o) {
    if (blank(v)) return opt ? { v: opt.def } : { err: name + " is required." };
    var n = Number(String(v).trim());
    if (!isFinite(n)) return { err: name + " must be a number." };
    if (n < 0) return { err: name + " cannot be negative." };
    if (o && o.max !== undefined && n > o.max) return { err: name + " cannot be above " + o.max + "." };
    if (o && o.int && Math.floor(n) !== n) return { err: name + " must be a whole number." };
    return { v: n };
  }
  var cents = function (d) { return Math.round(d * 100); };
  var dollars = function (c) { return c / 100; };
  function lifetime(x) {
    x = x || {};
    var f = {
      firstPrice: num(x.firstPrice, "First payment", null),
      months: num(x.months, "Months paid", null, { int: true }),
      renewalPrice: num(x.renewalPrice, "Renewal price", { def: null }),
      activation: num(x.activation, "Activation fee", { def: 0 }),
      resets: num(x.resets, "Number of resets", { def: 0 }, { int: true }),
      resetFee: num(x.resetFee, "Reset fee", { def: 0 }),
      platformMonthly: num(x.platformMonthly, "Platform cost per month", { def: 0 }),
      dataMonthly: num(x.dataMonthly, "Data cost per month", { def: 0 }),
      taxPct: num(x.taxPct, "Tax", { def: 0 }, { max: 100 }),
      splitPct: num(x.splitPct, "Profit split", { def: null }, { max: 100 })
    };
    for (var k in f) if (f[k].err) return { ok: false, reason: f[k].err };
    if (f.months.v < 1) return { ok: false, reason: "Months paid must be at least 1." };
    var v = {}; for (k in f) v[k] = f[k].v;
    var renewal = v.renewalPrice === null ? v.firstPrice : v.renewalPrice;
    var evaluation = cents(v.firstPrice) + (v.months - 1) * cents(renewal);
    var resetsCost = v.resets * cents(v.resetFee), activation = cents(v.activation);
    var tools = v.months * (cents(v.platformMonthly) + cents(v.dataMonthly));
    var subtotal = evaluation + resetsCost + activation + tools;
    var tax = Math.round(subtotal * v.taxPct / 100), total = subtotal + tax;
    var gross = v.splitPct && v.splitPct > 0 ? Math.round(total / (v.splitPct / 100)) : null;
    return {
      ok: true, evaluation: dollars(evaluation), resetsCost: dollars(resetsCost), activation: dollars(activation), tools: dollars(tools),
      subtotal: dollars(subtotal), tax: dollars(tax), total: dollars(total), breakevenPayout: dollars(total),
      breakevenGross: gross === null ? null : dollars(gross), renewalAssumed: v.renewalPrice === null && v.months > 1,
      lines: [["Evaluation fees", dollars(evaluation)], ["Resets", dollars(resetsCost)], ["Activation", dollars(activation)], ["Platform and data", dollars(tools)], ["Tax (as entered)", dollars(tax)]]
    };
  }
  return { lifetime: lifetime };
});
