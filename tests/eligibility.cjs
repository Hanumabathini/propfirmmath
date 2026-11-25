// Country eligibility: the extracted data + pure module must give exactly the answers the old inline region.js gave.
const a = require("node:assert/strict"), fs = require("fs"), cp = require("child_process");
const E = require("../src/eligibility.js"), D = require("../data/country-policies.json");
const old = cp.execSync("git show aed4e10:src/region.js", { cwd: __dirname + "/.." }).toString();
const s = old.indexOf("const policies=") + 15, e = old.indexOf("};\nfunction region") + 1;
const oldPolicies = eval("(" + old.slice(s, e) + ")");
const fs2 = old.indexOf("function region"), fe = old.indexOf("function get()");
const oldRegion = new Function("policies", old.slice(fs2, fe) + "; return region;")(oldPolicies);
const groups = old.match(/const groups=\{(.*?)\};/s)[1];
const countries = new Set(["", "OTHER", "ZZ"]); groups.replace(/"([A-Z ]+)"/g, (_, l) => l.split(" ").forEach(c => c && countries.add(c)));
let n = 0;
Object.keys(oldPolicies).forEach(f => countries.forEach(c => {
  const o = oldRegion(f, c), x = E.evaluate(D.firms, f, c);
  a.equal(x.label, o.label, f + "/" + c); a.equal(x.blocked, o.blocked, f + "/" + c); a.equal(x.source, o.source, f + "/" + c); n++;
}));
a.equal(E.evaluate(D.firms, "Unlisted Firm", "PK").status, "unverified");
a.equal(E.evaluate(D.firms, "Topstep", "").status, "select");
a.equal(E.evaluate(D.firms, "Topstep", "PK").status, "restricted");
a.equal(E.evaluate(D.firms, "Topstep", "DE").status, "limited");
Object.entries(D.firms).forEach(([f, p]) => { a.ok(/^https:\/\//.test(p.source), f + " needs an official source URL"); a.ok(Array.isArray(p.blocked)); });
const g = E.forCountry(D.firms, [{ name: "Topstep" }, { name: "Bulenox" }], "PK");
a.equal(g.restricted.length, 1); a.equal(g.unverified.length, 1);
console.log("Eligibility checks passed (" + n + " firm/country combinations identical to the old logic)");
