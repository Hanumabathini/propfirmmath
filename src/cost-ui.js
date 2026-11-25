(function () {
  "use strict";
  var form = document.getElementById("cost-form"); if (!form || !window.PFMCost) return;
  var out = document.getElementById("cost-out"), ids = ["firstPrice", "renewalPrice", "months", "activation", "resets", "resetFee", "platformMonthly", "dataMonthly", "taxPct", "splitPct"];
  var money = function (n) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); };
  var el = function (t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  function read() { var o = {}; ids.forEach(function (k) { o[k] = form.elements[k].value; }); return o; }
  function draw() {
    var v = read(), r = window.PFMCost.lifetime(v), u = new URLSearchParams();
    ids.forEach(function (k) { if (v[k] !== "") u.set(k, v[k]); }); history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : ""));
    out.replaceChildren();
    if (!r.ok) { out.append(el("p", "note", r.reason === "First payment is required." ? "Enter the first payment and months paid to see your total." : r.reason)); return; }
    out.append(el("p", "note", "Total cost over the period"), el("div", "big", money(r.total)));
    r.lines.forEach(function (l) { var row = el("div", "analysis-row"); row.append(el("span", null, l[0]), el("strong", null, money(l[1]))); out.append(row); });
    var be = el("div", "kpis"); [["Cash to break even", money(r.breakevenPayout)], ["Gross payout needed", r.breakevenGross === null ? "Enter a split" : money(r.breakevenGross)]].forEach(function (p) { var k = el("div", "kpi"); k.append(el("b", null, p[1]), el("small", null, p[0])); be.append(k); });
    out.append(be);
    if (r.renewalAssumed) out.append(el("p", "note", "Renewal price left blank, so renewals are counted at the first price."));
  }
  var q = new URLSearchParams(location.search); ids.forEach(function (k) { if (q.has(k)) form.elements[k].value = q.get(k); });
  form.addEventListener("input", draw); form.addEventListener("submit", function (e) { e.preventDefault(); }); draw();
})();
