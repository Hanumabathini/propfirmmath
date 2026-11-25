"""Deals validation: invalid entries fail the build; stale or expired ones are hidden; nothing is invented."""
import sys, datetime; sys.path.insert(0, ".")
from site_pages import validate_deals
T = datetime.date(2026, 11, 25)
ok = dict(id="a", firm="X", headline="10% off", url="https://x.com/?ref=1", source_type="affiliate-approved", source_url="https://x.com/affiliates", terms="New accounts only", checked="2026-11-20")
live, bad = validate_deals({"deals": [ok]}, T); assert len(live) == 1 and not bad
live, bad = validate_deals({"deals": [dict(ok, checked="2026-09-01")]}, T); assert not live and not bad, "stale hidden"
live, bad = validate_deals({"deals": [dict(ok, expires="2026-11-01")]}, T); assert not live and not bad, "expired hidden"
for broken in (dict(ok, url="http://x.com"), dict(ok, source_type="guess"), {k: v for k, v in ok.items() if k != "terms"}, dict(ok, checked="2027-01-01")):
    live, bad = validate_deals({"deals": [broken]}, T); assert bad and not live, broken
assert validate_deals({"deals": []}, T) == ([], [])
print("Deals validation checks passed")
