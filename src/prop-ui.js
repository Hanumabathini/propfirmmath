/* Wires the funded-trader calculators. Each calculator is a <section data-prop="mode"> with inputs marked data-k. */
(function () {
  "use strict";
  var P = window.PROP;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); };
  var money = function (n) {
    return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  var kpi = function (label, value) { return "<div class=kpi><small>" + esc(label) + "</small><b>" + value + "</b></div>"; };
  var WARN = "<p class=note><b>Estimate only.</b> Firms change their rules and apply them in their own way. Check the numbers with your firm before you trade or ask for a payout.</p>";

  function read(sec) {
    var x = {};
    sec.querySelectorAll("[data-k]").forEach(function (el) {
      var k = el.getAttribute("data-k");
      if (el.type === "checkbox") x[k] = el.checked;
      else if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") x[k] = el.value;
      else x[k] = el.value === "" ? 0 : Number(el.value);
    });
    return x;
  }

  var RENDER = {
    consistency: function (x) {
      var r = P.consistency(P.parseDays(x.days), x.rulePct);
      if (!r.days) return "<p>Add your daily profit and loss, one number per day.</p>";
      if (r.total <= 0) return "<p class=big>No profit yet</p><p>Your days add up to " + money(r.total) + ". The rule only matters once you're in profit.</p>";
      var head = r.pass
        ? "<p class=note>Within the " + r.rulePct + "% rule</p><p class='big pos'>Passing</p>"
        : "<p class=note>Over the " + r.rulePct + "% rule</p><p class='big neg'>Not yet</p>";
      var tail = r.pass
        ? "<p>Your best day is " + r.pct + "% of your profit. At this total, any single day up to " + money(r.maxBestDay) + " keeps you inside the rule.</p>"
        : "<p>Your best day (day " + r.bestDay + ") is " + r.pct + "% of your profit. Make <b>" + money(r.moreProfit) + "</b> more, without a day bigger than " + money(r.best) + ", to get back inside the rule.</p>";
      return head + "<div class=kpis>" + kpi("Total profit", money(r.total)) + kpi("Best day", money(r.best)) + kpi("Best day share", r.pct + "%") + "</div>" + tail;
    },
    payout: function (x) {
      var r = P.payout(x);
      var out = "<p class=note>You'd receive about</p><p class='big pos'>" + money(r.receive) + "</p><div class=kpis>" +
        kpi("Above the floor", money(r.available)) + kpi("Requested", money(r.minOk ? r.request : 0)) + kpi("Firm's share", money(r.firmShare)) + "</div>";
      if (!r.minOk) out += "<p class=neg>That's under the " + money(Number(x.minPayout)) + " minimum payout, so there's nothing to request yet.</p>";
      else if (r.available > r.capped) out += "<p>The firm's payout limits hold you to " + money(r.capped) + " this time.</p>";
      out += "<p>The balance must stay above " + money(r.floor) + ". After this payout it would be " + money(r.after) + ".</p>";
      return out;
    },
    drawdown: function (x) {
      var r = P.drawdown(x);
      var cls = r.room > 0 ? "pos" : "neg";
      var out = "<p class=note>Room before the account fails</p><p class='big " + cls + "'>" + money(r.room) + "</p><div class=kpis>" +
        kpi("Fails at", money(r.level)) + kpi("Peak used", money(r.peak)) + kpi("Trailing", x.type === "static" ? "Never" : (r.locked ? "Stopped" : "Still moving")) + "</div>";
      if (r.room <= 0) out += "<p class=neg>The balance is at or under the failure level.</p>";
      else if (r.toLock > 0) out += "<p>The threshold keeps trailing until your peak is " + money(Number(x.lockAt) + Number(x.amount)) + ", " + money(r.toLock) + " above where it is now.</p>";
      return out;
    },
    target: function (x) {
      var r = P.targetPlan(x);
      if (r.leftRule <= 0) return "<p class='big pos'>Target reached</p><p>You're at or past the profit you need. Check the firm's minimum trading days before you count it as passed.</p>";
      var out = r.perDay !== null
        ? "<p class=note>Average needed per day</p><p class=big>" + money(r.perDay) + "</p>"
        : "<p class=note>Profit still to make</p><p class=big>" + money(r.leftRule) + "</p>";
      out += "<div class=kpis>" + kpi("Still to make", money(r.leftRule)) + kpi("Fewest days", String(r.minDays)) +
        kpi("Biggest safe day", r.dayCap === null ? "No limit" : money(r.dayCap)) + "</div>";
      if (r.finishAt > Number(x.target)) out += "<p>Your best day so far means you have to finish at " + money(r.finishAt) + ", not " + money(Number(x.target)) + ", to stay inside the consistency rule.</p>";
      if (r.fits === false) out += "<p class=neg>" + Number(x.days) + " days isn't enough. You need at least " + r.minDays + ".</p>";
      return out;
    },
    size: function (x) {
      var r = P.positionSize(x);
      var out = "<p class=note>Contracts you can trade</p><p class=big>" + r.contracts + "</p><div class=kpis>" +
        kpi("Stop in ticks", String(r.ticks)) + kpi("Risk per contract", money(r.perContract)) + kpi("Total risk", money(r.risk)) + "</div>" +
        "<p class=note>" + esc(r.name) + ": one tick is " + r.tickSize + " points and worth " + money(r.tickValue) + ", so one point is " + money(r.pointValue) + ".</p>";
      if (r.contracts === 0 && r.perContract > 0) out += "<p class=neg>Your stop risks " + money(r.perContract) + " on one contract, more than you set. Try a micro contract or a tighter stop.</p>";
      return out;
    }
  };

  document.querySelectorAll("section[data-prop]").forEach(function (sec) {
    var mode = sec.getAttribute("data-prop"), out = $(".result", sec);
    var go = function () { out.innerHTML = RENDER[mode](read(sec)) + WARN; };
    var preset = $("select.preset", sec);
    if (preset) preset.addEventListener("change", function () {
      var opt = preset.options[preset.selectedIndex], vals = opt && opt.getAttribute("data-v");
      if (!vals) return;
      var v = JSON.parse(vals);
      Object.keys(v).forEach(function (k) {
        var el = sec.querySelector("[data-k='" + k + "']");
        if (el) el.value = v[k];
      });
      var src = $(".preset-src", sec);
      if (src) src.innerHTML = opt.getAttribute("data-src") || "";
      go();
    });
    sec.addEventListener("input", go);
    sec.addEventListener("change", go);
    go();
  });
})();
