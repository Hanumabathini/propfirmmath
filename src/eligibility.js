/* PropFirmMath country eligibility. Pure functions; data comes from data/country-policies.json.
   Statuses: select (no country chosen), unverified (no reviewed list), restricted, limited, review (special note), reviewed (not on the reviewed list, still verify). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PFMEligibility = factory();
})(this, function () {
  "use strict";
  var has = function (list, c) { return Array.isArray(list) && list.indexOf(c) !== -1; };
  function evaluate(policies, firm, c) {
    var p = policies && policies[firm];
    if (!c) return { status: "select", label: "Select country first", blocked: false };
    if (!p || c === "OTHER") return { status: "unverified", label: "Regional eligibility unverified", blocked: false };
    var src = p.source, r = function (status, label) { return { status: status, label: label, blocked: status === "restricted", source: src }; };
    if (firm === "FXIFY" && (c === "US" || c === "HT")) return r("review", "Official sources differ; confirm eligibility before purchase");
    if (firm === "Funded Trading Plus" && c === "UA") return r("review", "Subnational restrictions apply; confirm your region");
    if (firm === "Elite Trader Funding") return r("review", "Requires both Rise and Stripe support; verify residence and live broker");
    if (firm === "FTMO" && (c === "US" || c === "AU")) return r("review", "Separate regional FTMO entity; verify local account rules and pricing");
    if (has(p.blocked, c)) return r("restricted", "Restricted for new accounts");
    if (p.partial) return r("review", "Regional policy requires further verification");
    if (firm === "FundedNext" && c === "US") return r("review", "US-specific accounts and prices; Match-Trader only; confirm plan availability");
    if (has(p.limited, c)) return r("limited", "Express funded only; no Live account");
    if (has(p.cap, c)) return r("limited", "Maximum 3 simulated funded accounts");
    return r("reviewed", "Not on reviewed restriction list; citizenship, KYC and plan checks apply");
  }
  // Every directory firm for one country, grouped. Firms with no policy file are "unverified", never "available".
  function forCountry(policies, firms, c) {
    var out = { restricted: [], limited: [], review: [], reviewed: [], unverified: [] };
    firms.forEach(function (f) {
      var e = evaluate(policies, f.name, c); e.firm = f;
      out[e.status === "select" ? "unverified" : e.status].push(e);
    });
    return out;
  }
  // How many countries each firm lists as restricted (for the firm-side view).
  function restrictedCount(policies, firm) { var p = policies && policies[firm]; return p ? p.blocked.length : null; }
  return { evaluate: evaluate, forCountry: forCountry, restrictedCount: restrictedCount };
});
