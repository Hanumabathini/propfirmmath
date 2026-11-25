const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const eligibility = require("../src/eligibility.js");
const { firms } = require("../data/country-policies.json");
const baseline = require("./fixtures/eligibility-baseline.json");

// Each fingerprint covers the legacy label, restriction flag, and source for
// every country. Keep it in the checkout so deployment builds need no history.
const countries = ["", ...baseline.countryCodes.split(" ")];
for (const [firm, expected] of Object.entries(baseline.firmHashes)) {
  const outcomes = countries.map(country => {
    const { label, blocked, source } = eligibility.evaluate(firms, firm, country);
    return [label, blocked, source];
  });
  const fingerprint = createHash("sha256").update(JSON.stringify(outcomes)).digest("hex");
  assert.equal(fingerprint, expected, `${firm} eligibility differs from ${baseline.sourceCommit}`);
}

assert.equal(eligibility.evaluate(firms, "Unlisted Firm", "PK").status, "unverified");
assert.equal(eligibility.evaluate(firms, "Topstep", "").status, "select");
assert.equal(eligibility.evaluate(firms, "Topstep", "PK").status, "restricted");
assert.equal(eligibility.evaluate(firms, "Topstep", "DE").status, "limited");
for (const [firm, policy] of Object.entries(firms)) {
  assert.match(policy.source, /^https:\/\//, `${firm} needs an official source URL`);
  assert.ok(Array.isArray(policy.blocked));
}
const groups = eligibility.forCountry(firms, [{ name: "Topstep" }, { name: "Bulenox" }], "PK");
assert.equal(groups.restricted.length, 1);
assert.equal(groups.unverified.length, 1);
const comparisons = Object.keys(baseline.firmHashes).length * countries.length;
console.log(`Eligibility checks passed (${comparisons} firm/country combinations matched the baseline)`);
