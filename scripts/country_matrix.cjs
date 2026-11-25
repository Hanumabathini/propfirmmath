// Prints the country x firm eligibility matrix as JSON, using the same pure module the browser uses.
const E = require("../src/eligibility.js"), D = require("../data/country-policies.json"), dir = require("../data/directory.json");
const src = require("fs").readFileSync(__dirname + "/../src/region.js", "utf8");
const groups = src.match(/const groups=\{(.*?)\};/s)[1];
const codes = new Set(); groups.replace(/"([A-Z ]+)"/g, (_, l) => l.split(" ").forEach(c => c && codes.add(c)));
const names = new Intl.DisplayNames(["en"], { type: "region" });
const out = { countries: {}, firms: dir.map(d => ({ name: d.name, category: d.category })) };
[...codes].sort().forEach(c => {
  let n; try { n = names.of(c); } catch (e) { return; }
  if (!n || n === c) return;
  const m = {}; dir.forEach(d => { const r = E.evaluate(D.firms, d.name, c); m[d.name] = [r.status, r.label]; });
  out.countries[c] = { name: n, firms: m };
});
process.stdout.write(JSON.stringify(out));
