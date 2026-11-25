/* Country finder: interactive view over the same eligibility module the calculators use. Shareable URL: ?country=PK&market=Futures&status=restricted&q=top */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("cf-country"); if (!sel || !window.PFMEligibility || !window.PFM_POLICIES || !window.PFMRegion) return;
  var firms = JSON.parse($("cf-firms").textContent), P = window.PFM_POLICIES.firms, R = window.PFMRegion;
  var META = {
    restricted: ["Restricted", "✕"], limited: ["Limited", "◐"], review: ["Confirm with firm", "?"],
    reviewed: ["Not on restricted list", "✓"], unverified: ["Not reviewed", "–"]
  };
  var ORDER = ["reviewed", "limited", "review", "restricted", "unverified"];
  var state = { country: "", market: "all", status: "all", q: "" };
  var names = new Intl.DisplayNames(["en"], { type: "region" });
  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  Object.keys(R.mapping).sort(function (a, b) { return R.name(a).localeCompare(R.name(b)); }).forEach(function (c) { sel.add(new Option(R.name(c), c)); });

  function fromUrl() {
    var u = new URLSearchParams(location.search);
    var c = (u.get("country") || "").toUpperCase();
    if (!c) { try { c = sessionStorage.getItem("pfm-country") || ""; } catch (e) {} }
    state.country = R.mapping[c] ? c : "";
    state.market = u.get("market") || "all"; state.status = u.get("status") || "all"; state.q = u.get("q") || "";
  }
  function toUrl() {
    var u = new URLSearchParams();
    if (state.country) u.set("country", state.country);
    if (state.market !== "all") u.set("market", state.market);
    if (state.status !== "all") u.set("status", state.status);
    if (state.q) u.set("q", state.q);
    var s = u.toString(); history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
    return location.origin + location.pathname + (s ? "?" + s : "");
  }
  function seg(host, items, current, onPick) {
    host.replaceChildren();
    items.forEach(function (it) {
      var b = el("button", "seg-btn", it[1]); b.type = "button"; b.setAttribute("aria-pressed", String(current === it[0]));
      b.addEventListener("click", function () { onPick(it[0]); }); host.append(b);
    });
  }
  function render() {
    var out = $("cf-out"), empty = $("cf-empty");
    sel.value = state.country; $("cf-q").value = state.q;
    if (!state.country) { out.hidden = true; empty.hidden = false; toUrl(); return; }
    empty.hidden = true; out.hidden = false;
    var all = firms.map(function (f) { var r = window.PFMEligibility.evaluate(P, f.name, state.country); r.firm = f; return r; });
    var counts = { all: all.length }; ORDER.forEach(function (k) { counts[k] = 0; }); all.forEach(function (r) { counts[r.status]++; });
    seg($("cf-status"), [["all", "All " + counts.all]].concat(ORDER.map(function (k) { return [k, META[k][0] + " " + counts[k]]; })), state.status, function (v) { state.status = v; render(); });
    var markets = Array.from(new Set(firms.map(function (f) { return f.category; })));
    seg($("cf-market"), [["all", "All markets"]].concat(markets.map(function (m) { return [m, m]; })), state.market, function (v) { state.market = v; render(); });
    var q = state.q.trim().toLowerCase();
    var shown = all.filter(function (r) {
      return (state.status === "all" || r.status === state.status) && (state.market === "all" || r.firm.category === state.market) && (!q || r.firm.name.toLowerCase().indexOf(q) !== -1);
    }).sort(function (a, b) { return ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.firm.name.localeCompare(b.firm.name); });
    var list = $("cf-list"); list.replaceChildren();
    shown.forEach(function (r) {
      var row = el("article", "firm-row s-" + r.status), a = el("div"), h = el("h3"), link = el("a", null, r.firm.name); link.href = r.firm.path; h.append(link);
      a.append(h, el("small", null, r.firm.category));
      var b = el("div"), badge = el("span", "badge s-" + r.status), g = el("i", null, META[r.status][1]); g.setAttribute("aria-hidden", "true");
      badge.append(g, document.createTextNode(META[r.status][0])); b.append(badge, el("p", "note", r.label));
      var l = el("div", "row-links");
      if (r.source) { var s = el("a", null, "Firm's country page"); s.href = r.source; s.rel = "noopener noreferrer"; l.append(s); }
      row.append(a, b, l); list.append(row);
    });
    if (!shown.length) list.append(el("div", "card empty", "No firms match these filters."));
    $("cf-summary").textContent = R.name(state.country) + ": " + counts.restricted + " restricted, " + (counts.reviewed + counts.limited) + " not restricted (checks still apply), " + counts.review + " to confirm, " + counts.unverified + " not reviewed. Showing " + shown.length + " of " + counts.all + ".";
    var url = toUrl(); $("cf-share").textContent = "Share this view: " + url;
  }
  function setCountry(c) {
    state.country = c; try { sessionStorage.setItem("pfm-country", c); } catch (e) {}
    var top = document.getElementById("site-country"); if (top && top.value !== c) { top.value = c; top.dispatchEvent(new Event("change")); }
    render();
  }
  sel.addEventListener("change", function () { setCountry(sel.value); });
  $("cf-q").addEventListener("input", function (e) { state.q = e.target.value; render(); });
  document.querySelectorAll(".finder-box .chip").forEach(function (a) { a.addEventListener("click", function (ev) { ev.preventDefault(); var m = a.getAttribute("href").match(/country-finder\/([^/]+)\//); var nm = a.textContent; var code = Object.keys(R.mapping).find(function (c) { return R.name(c) === nm; }); if (code) setCountry(code); else location.href = a.href; }); });
  fromUrl(); render();
})();
