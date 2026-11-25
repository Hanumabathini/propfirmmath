"""Country finder, per-country pages and the verified Deals page."""
import json, re, subprocess, datetime, html, shutil
from expanded import firm_path

STATUS = {  # key: (short label, glyph, meaning)
    "restricted": ("Restricted", "✕", "The firm's own page lists this country as restricted for new accounts."),
    "limited": ("Limited", "◐", "Allowed with a limit the firm publishes (for example a smaller account type or account cap)."),
    "review": ("Confirm with firm", "?", "The firm's sources are partial, differ, or a special rule applies. Do not assume you can buy."),
    "reviewed": ("Not on restricted list", "✓", "Not on the restriction list we reviewed. Citizenship, KYC and plan checks still apply."),
    "unverified": ("Not reviewed", "–", "We have not yet read a country policy for this firm. Check the firm directly."),
}
ORDER = ["reviewed", "limited", "review", "restricted", "unverified"]
MAJOR = ["US", "GB", "CA", "AU", "DE", "FR", "IT", "ES", "NL", "IN", "PK", "AE", "SG", "NG", "BR", "ZA", "PH", "MY", "MX", "JP"]
MAX_AGE_DAYS = 45

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def load_matrix(ROOT):
    out = subprocess.run(["node", str(ROOT / "scripts/country_matrix.cjs")], capture_output=True, text=True, check=True).stdout
    return json.loads(out)

def validate_deals(raw, today=None):
    """Return (live, problems). A malformed entry is a build error; a stale or expired one is just hidden."""
    today = today or datetime.date.today()
    live, problems = [], []
    for i, d in enumerate(raw.get("deals", [])):
        tag = f"deal #{i + 1} ({d.get('firm', '?')})"
        for k in ("id", "firm", "headline", "url", "source_type", "source_url", "terms", "checked"):
            if not d.get(k):
                problems.append(f"{tag}: missing '{k}'")
        if d.get("source_type") not in ("affiliate-approved", "firm-published"):
            problems.append(f"{tag}: source_type must be affiliate-approved or firm-published")
        for k in ("url", "source_url"):
            if d.get(k) and not str(d[k]).startswith("https://"):
                problems.append(f"{tag}: '{k}' must be https")
        try:
            checked = datetime.date.fromisoformat(d.get("checked", ""))
            if checked > today:
                problems.append(f"{tag}: checked date is in the future")
        except ValueError:
            problems.append(f"{tag}: checked must be YYYY-MM-DD"); continue
        exp = None
        if d.get("expires"):
            try: exp = datetime.date.fromisoformat(d["expires"])
            except ValueError: problems.append(f"{tag}: expires must be YYYY-MM-DD"); continue
        if problems and any(p.startswith(tag) for p in problems):
            continue
        if exp and exp < today: continue
        if (today - checked).days > MAX_AGE_DAYS: continue
        live.append(d)
    return live, problems

def build_site_pages(h, page, url, ROOT, DIST, CHECKED):
    e = html.escape
    directory = json.loads((ROOT / "data/directory.json").read_text())
    pol = json.loads((ROOT / "data/country-policies.json").read_text())["firms"]
    M = load_matrix(ROOT)
    byname = {r["name"]: r for r in directory}
    shutil.copy(ROOT / "src/country-finder.js", DIST / "country-finder.js")

    legend = "".join(f'<li><span class="badge s-{k}"><i aria-hidden="true">{g}</i>{e(l)}</span><span>{e(m)}</span></li>' for k, (l, g, m) in STATUS.items())

    def firm_card(name, st, label, source=None):
        r = byname[name]; l, g, _ = STATUS[st]
        src = f'<a href="{e(source)}" rel="noopener noreferrer">Firm\'s country page</a>' if source else ""
        return (f'<article class="firm-row s-{st}"><div><h3><a href="{url(firm_path(r))}">{e(name)}</a></h3><small>{e(r["category"])}</small></div>'
                f'<div><span class="badge s-{st}"><i aria-hidden="true">{g}</i>{e(l)}</span><p class="note">{e(label)}</p></div><div class="row-links">{src}</div></article>')

    # ---- per-country pages
    made = []
    for code, c in M["countries"].items():
        counts = {k: 0 for k in STATUS}
        for st, _ in c["firms"].values(): counts[st] += 1
        if not (counts["restricted"] or counts["limited"] or code in MAJOR):
            continue
        sl = slug(c["name"]); path = f"country-finder/{sl}/"
        groups = ""
        for st in ORDER:
            items = [n for n, (s, _) in c["firms"].items() if s == st]
            if not items: continue
            l, g, m = STATUS[st]
            groups += f'<section class="grp"><h2><span class="badge s-{st}"><i aria-hidden="true">{g}</i>{e(l)}</span> <small>{len(items)} firm{"s" if len(items) != 1 else ""}</small></h2><p class="note">{e(m)}</p>' + "".join(firm_card(n, st, c["firms"][n][1], (pol.get(n) or {}).get("source")) for n in items) + "</section>"
        n_all = len(c["firms"])
        summary = f'{counts["restricted"]} of {n_all} firms we track list {e(c["name"])} as restricted. {counts["reviewed"] + counts["limited"]} are not restricted for new accounts on the lists we reviewed, {counts["review"]} need confirmation, and {counts["unverified"]} have no country policy reviewed yet.'
        body = f"""<section class="hero hero-sm"><p class="eyebrow">Country finder</p><h1>Prop firms for traders in {e(c["name"])}</h1><p class="lede">{summary}</p>
<p><a class="btn" href="{url('country-finder/')}?country={code}">Filter and compare interactively</a></p></section>
<div class="warn">Eligibility depends on citizenship, residence, KYC and the exact plan. This page reflects each firm's published restriction list as we read it ({e(CHECKED)}). Confirm with the firm before you pay.</div>
{groups}<p class="note">Not listed? <a href="{url('directory/')}">Browse every firm profile</a> or <a href="{url('country-finder/')}">choose another country</a>.</p>"""
        page(path, f"Prop firms for traders in {c['name']} | Country eligibility by firm", f"Which prop firms restrict or accept traders from {c['name']}: status per firm with a link to each firm's own country policy.", body,
             crumbs=[("Home", ""), ("Country finder", "country-finder/"), (c["name"], path)])
        made.append((code, c["name"], sl, counts))

    # ---- hub
    pop = "".join(f'<a class="chip" href="{url("country-finder/" + sl + "/")}">{e(n)}</a>' for code, n, sl, _ in sorted(made, key=lambda x: x[1]) if code in MAJOR)
    all_links = "".join(f'<li><a href="{url("country-finder/" + sl + "/")}">{e(n)}</a></li>' for _, n, sl, _ in sorted(made, key=lambda x: x[1]))
    firm_rows = ""
    for r in directory:
        p = pol.get(r["name"])
        n = f'{len(p["blocked"])} countries listed' if p else "Not reviewed yet"
        flag = " (list may be incomplete)" if p and p.get("partial") else ""
        src = f'<a href="{e(p["source"])}" rel="noopener noreferrer">Official country page</a>' if p else "—"
        firm_rows += f'<tr><td><a href="{url(firm_path(r))}">{e(r["name"])}</a></td><td>{e(r["category"])}</td><td>{e(n + flag)}</td><td>{src}</td></tr>'
    firms_json = json.dumps([{"name": r["name"], "category": r["category"], "path": url(firm_path(r))} for r in directory]).replace("<", "\\u003c")
    reviewed_n = len(pol)
    body = f"""<section class="hero"><p class="eyebrow">Country finder</p><h1>Which prop firms accept traders from your country?</h1>
<p class="lede">Pick where you live. See every firm we track, sorted by what the firm's own country policy says, with the source one click away.</p>
<div class="finder-box"><label for="cf-country">Country of residence</label><select id="cf-country"><option value="">Choose your country</option></select>
<div class="chips" aria-label="Popular countries">{pop}</div></div>
<div class="hero-stats"><div><strong>{len(directory)}</strong><span>firms tracked</span></div><div><strong>{reviewed_n}</strong><span>with an official country list</span></div><div><strong>{len(M["countries"])}</strong><span>countries covered</span></div></div></section>
<section id="cf-app" aria-live="polite"><div class="card empty" id="cf-empty"><h2>Choose a country to begin</h2><p>You'll see which firms restrict it, which are not on a restricted list, and which we have not reviewed yet. Without JavaScript, use the country links below.</p></div>
<div id="cf-out" hidden><div class="cf-tools"><div class="seg" role="group" aria-label="Filter by status" id="cf-status"></div><div class="seg" role="group" aria-label="Filter by market" id="cf-market"></div><label class="sr" for="cf-q">Search firms</label><input id="cf-q" type="search" placeholder="Search firms"></div><p class="note" id="cf-summary" role="status"></p><div id="cf-list"></div><p class="note" id="cf-share"></p></div></section>
<section class="band"><h2>How to read the labels</h2><ul class="legend">{legend}</ul><p class="note">"Not on restricted list" is never a promise you can buy. Firms also check citizenship, KYC and the plan you choose, and they change lists without notice.</p></section>
<section><h2>Browse by firm</h2><div class="table-scroll"><table><thead><tr><th>Firm</th><th>Market</th><th>Restricted-country list</th><th>Source</th></tr></thead><tbody>{firm_rows}</tbody></table></div></section>
<section><h2>Country pages</h2><ul class="cols">{all_links}</ul><p class="note">Pages exist for the major markets and for every country that at least one firm restricts or limits.</p></section>
<script type="application/json" id="cf-firms">{firms_json}</script>
<script defer src="{url('country-finder.js')}"></script>"""
    page("country-finder/", "Country finder: which prop firms accept your country | PropFirmMath", "Choose your country and see which prop firms restrict it, which are not on a restricted list, and which are not reviewed yet, with each firm's official source.", body,
         crumbs=[("Home", ""), ("Country finder", "country-finder/")])

    # ---- deals
    raw = json.loads((ROOT / "data/deals.json").read_text())
    live, problems = validate_deals(raw)
    if problems:
        raise SystemExit("deals.json invalid:\n  " + "\n  ".join(problems))
    cards = ""
    for d in live:
        code = f'<p>Code <b class="code">{e(d["code"])}</b> (type it at checkout)</p>' if d.get("code") else "<p>No code needed: the discount applies through this link.</p>"
        exp = f' · Expires {e(d["expires"])}' if d.get("expires") else ""
        cards += (f'<article class="card deal"><span class="badge s-ad">Paid link</span><h3>{e(d["firm"])}</h3><p><b>{e(d["headline"])}</b></p>{code}<p class="note">{e(d["terms"])}</p>'
                  f'<p class="note">Checked {e(d["checked"])}{exp} · <a href="{e(d["source_url"])}" rel="noopener noreferrer">How it was verified</a></p>'
                  f'<a class="btn" href="{e(d["url"])}" rel="sponsored noopener noreferrer">Go to {e(d["firm"])}</a></article>')
    state = (f'<div class="deal-grid">{cards}</div>' if live else
             '<div class="card empty"><h2>No verified offers right now</h2><p>We list a deal only when it comes from a firm-approved partner programme or from the firm\'s own page, and we check it again within 45 days. Nothing here is guessed, and nothing counts down to create pressure.</p><p><a class="btn" href="' + url("prop-firm-comparison/") + '">Compare firms instead</a></p></div>')
    body = f"""<section class="hero hero-sm"><p class="eyebrow">Deals</p><h1>Prop firm deals we have checked</h1><p class="lede">Only codes and links that come from an approved partner programme or the firm's own page. Each shows when we last checked it.</p></section>
{state}
<section class="band"><h2>How promo codes work</h2><ul class="plain"><li>A prop firm gives approved partners a link or a code. When you buy through it, the firm pays the partner a commission, and the price you see is the firm's price for that offer.</li><li>Codes change and end without notice. Always confirm the final price at checkout before you pay.</li><li>Links marked <span class="badge s-ad">Paid link</span> may pay us a commission. A deal never changes how we rank or describe a firm.</li><li>If you see a code elsewhere that we have not listed, it may be expired or unofficial. We do not list codes we cannot verify.</li></ul></section>"""
    page("deals/", "Verified prop firm deals and promo codes | PropFirmMath", "Prop firm discount codes and offers, listed only when they come from an approved partner programme or the firm itself, with the date we checked them.", body,
         crumbs=[("Home", ""), ("Deals", "deals/")])
    return {"countries": len(made), "deals": len(live)}
