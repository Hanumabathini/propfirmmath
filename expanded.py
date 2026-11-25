"""Interactive research directory and user-input scenario workspace."""
import json, html, shutil, re
from urllib.parse import urlencode

def firm_path(r):
    return r.get('path') or 'firms/' + re.sub(r'[^a-z0-9]+','-',r['name'].lower()).strip('-') + '/'
def firm_compare_path(name):
    return "prop-firm-comparison/?" + urlencode({"firm": name})

def build_expanded(page, url, ROOT, DIST, CHECKED):
    e = html.escape
    records = json.loads((ROOT / "data/directory.json").read_text())
    categories = sorted(set(r["category"] for r in records))
    opts = "".join(f'<option value="{e(c)}">{e(c)}</option>' for c in categories)
    cards = []
    for r in records:
        name, category = e(r["name"]), e(r["category"])
        known = r["status"] == "sourced-preset"
        partial = r["status"] == "partial-source"
        status = "Existing sourced preset — verify plan and region" if known else ("Partial official rules — no full preset" if partial else "Research pending — no verified preset")
        detail = ""
        if partial:
            detail = f'<p>{e(r["summary"])}</p><p class="note">Checked {e(r["checked"])} · <a href="{e(r["source"])}" rel="noopener noreferrer">Official rules</a></p>'
            if r.get("plans"):
                detail += "<div class=table-scroll><table><thead><tr><th>Phase</th><th>Target</th><th>Daily loss</th><th>Max loss</th><th>Days</th></tr></thead><tbody>" + "".join(f"<tr><td>{e(a)}</td><td>{b}%</td><td>{c}%</td><td>{d}%</td><td>{n}</td></tr>" for a,b,c,d,n in r["plans"]) + "</tbody></table></div>"
        if r.get("account_plans"):
            detail += '<div class="table-scroll"><table><thead><tr><th>Account</th><th>Published base price / fees</th><th>Target</th><th>Drawdown</th><th>Consistency</th></tr></thead><tbody>' + "".join("<tr>"+"".join("<td>"+e(str(p.get(k,"Not verified")))+"</td>" for k in ["label","price","target","dd","consistency"])+"</tr>" for p in r["account_plans"])+"</tbody></table></div>"
        if r.get("pricing_sources"):
            detail += "<ul>"+"".join(f'<li><a href="{e(u)}" rel="noopener noreferrer">{e(t)}</a></li>' for u,t in r["pricing_sources"])+"</ul>"
        link = url(firm_path(r))
        action = "View firm rules" if known else "View firm profile"
        if not known:
            profile = f"""<h1>{name}</h1><p class="lede">{category} · {status}</p><p class="page-actions"><a class="btn" href="{url(firm_compare_path(r['name']))}">Compare this firm</a><a href="{url('directory/')}">Back to the directory</a></p>{detail}<div class="warn">This profile is not a complete rule set. Account availability, eligibility and terms require independent confirmation. Do not treat missing rules as zero or unlimited.</div><h2>Account and rule coverage</h2><div class="table-scroll"><table><thead><tr><th>Rule</th><th>Data status</th></tr></thead><tbody>""" + "".join(f"<tr><td>{e(k)}</td><td>Not fully verified</td></tr>" for k in ["Account sizes and fees","Profit targets","Drawdown and daily loss","Contract limits","Consistency","Payout minimum and cap","Profit split","Minimum trading days","Country restrictions"]) + "</tbody></table></div>"
            profile += "<h2>Calculate using your own confirmed rules</h2><ul class=grid-links>" + "".join(f'<li><a href="{url(p)}">{e(t)}</a></li>' for p,t in [("workspace/","Multi-account workspace"),("prop-firm-payout-calculator/","Payout calculator"),("consistency-rule-calculator/","Consistency calculator"),("trailing-drawdown-calculator/","Drawdown calculator"),("profit-target-calculator/","Profit target planner"),("futures-position-size-calculator/","Futures position size"),("plan-compare/","Manual plan comparison"),("directory/","All firms")]) + "</ul>"
            page(firm_path(r), r["name"]+" — Prop firm research profile", "Research status and manual calculators for "+r["name"]+".", profile, crumbs=[("Home",""),("Firm directory","directory/"),(r["name"],firm_path(r))])
        cards.append(f"""<article class="directory-card card" data-category="{category}" data-status="{r["status"]}" data-name="{name.lower()}">
  <p class="directory-market">{category}</p><h2>{name}</h2><p class="note">{status}</p>
  <div class="directory-actions"><a href="{link}">{action}</a>
  <label class="directory-pick" hidden><input type="checkbox" value="{name}" aria-label="Compare {name}"> Compare</label></div>
</article>""")
    directory = f"""<section class="experience-hero">
  <h1>Prop firm directory</h1><p class="lede">Browse firms by market, check the source coverage, and compare up to three account plans.</p>
  <div class="metric-strip"><span><strong>{len(records)}</strong> firms tracked</span><span><strong>{sum(r["status"] == "sourced-preset" for r in records)}</strong> with sourced presets</span></div>
</section>
<section class="directory-filters filter-panel card" aria-label="Filter firm directory">
  <div class="fields">
    <div><label for="directory-search">Search by name</label><input id="directory-search" type="search" placeholder="Search firms"></div>
    <div><label for="directory-category">Market</label><select id="directory-category"><option value="">All markets</option>{opts}</select></div>
    <div><label for="directory-status">Research coverage</label><select id="directory-status"><option value="">All coverage</option><option value="sourced-preset">Sourced presets</option><option value="partial-source">Partial official rules</option><option value="research-needed">Research pending</option></select></div>
  </div>
  <p id="directory-count" class="note" role="status"></p>
</section>
<section class="directory-shortlist" aria-label="Comparison shortlist" hidden>
  <div><strong>Compare account plans</strong><p id="directory-compare-status" role="status">Choose up to three firms.</p></div>
  <div class="directory-shortlist-actions"><button id="directory-compare-clear" type="button" hidden>Clear selection</button><a id="directory-compare" class="btn" href="{url('prop-firm-comparison/')}">Open comparison</a></div>
</section>
<div class="directory-grid" id="directory-grid">{''.join(cards)}</div>
<div class="card empty" id="directory-empty" hidden><h2>No firms match these filters</h2><p>Try a different name, market or research coverage.</p><button class="btn" id="directory-reset" type="button">Clear filters</button></div>
<p class="note">Check official terms and regional restrictions before paying or applying.</p>
<script defer src="{url('expanded.js')}"></script>"""
    page("directory/", "Global prop firm research directory", "Search and compare prop firms by market and research coverage.", directory, crumbs=[("Home", ""), ("Firm directory", "directory/")])
    fields = [["accounts","Accounts"],["balance","Profit per account"],["buffer","Required retained profit"],["split","Trader share %"],["cap","Request cap per account (0 = none)"],["cost","Total evaluation and operating costs"],["fx","Conversion cost %"],["rate","Actual FX quote (destination per source)"]]
    controls = "".join(f'<div><label for="ws-{key}">{label}</label><input id="ws-{key}" data-field="{key}" type="number" min="0" step="any" required placeholder="Enter value"></div>' for key,label in fields)
    body = f"""<section class="experience-hero"><h1>Model your account portfolio</h1><p class="lede">Model aggregate payout requests, trader share and costs using your own account rules. All inputs must use a consistent source currency. No live rates or eligibility are implied.</p></section><section class="calc" id="expanded-workspace" data-mode="trader"><form class="card" id="workspace-form"><h2>Scenario inputs</h2><p class="note">Enter every field; use 0 where a fee or cost does not apply.</p><div class="fields">{controls}</div><button class="btn" type="submit">Calculate scenario</button></form><div class="card"><h2>Scenario analysis</h2><div id="workspace-result" aria-live="polite">Enter assumptions to calculate.</div><div id="workspace-chart" class="analysis-chart"></div><button id="workspace-export" type="button" class="btn" disabled>Download results CSV</button></div></section><section class="card"><h2>Related payout tools</h2><ul class="grid-links"><li><a href="{url('prop-firm-payout-calculator/')}">Single-account payout</a></li><li><a href="{url('global-traders/')}">International payout and country guide</a></li></ul><h2>Model boundaries</h2><p>The formula is a simplified manual model: requested profit is bounded by retained profit and the entered cap. It does not check drawdown, trading days, consistency, account status, regional restrictions or actual eligibility. FX is user-entered.</p></section><script defer src="{url('expanded.js')}"></script>"""
    page("workspace/", "Multi-account payout workspace", "Interactive manual financial scenario with explicit assumptions.", body)
    shutil.copy(ROOT / "src/expanded.js", DIST / "expanded.js")
