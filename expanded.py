"""Interactive research directory and user-input scenario workspace."""
import json, html, shutil, re

def firm_path(r):
    return r.get('path') or 'firms/' + re.sub(r'[^a-z0-9]+','-',r['name'].lower()).strip('-') + '/'
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
            profile = f"""<h1>{name}</h1><p class="lede">{category} · {status}</p>{detail}<div class="warn">This profile is not a complete rule set. Account availability, eligibility and terms require independent confirmation. Do not treat missing rules as zero or unlimited.</div><h2>Account and rule coverage</h2><div class="table-scroll"><table><thead><tr><th>Rule</th><th>Data status</th></tr></thead><tbody>""" + "".join(f"<tr><td>{e(k)}</td><td>Not fully verified</td></tr>" for k in ["Account sizes and fees","Profit targets","Drawdown and daily loss","Contract limits","Consistency","Payout minimum and cap","Profit split","Minimum trading days","Country restrictions"]) + "</tbody></table></div>"
            profile += "<h2>Calculate using your own confirmed rules</h2><ul class=grid-links>" + "".join(f'<li><a href="{url(p)}">{e(t)}</a></li>' for p,t in [("workspace/","Multi-account workspace"),("prop-firm-payout-calculator/","Payout calculator"),("consistency-rule-calculator/","Consistency calculator"),("trailing-drawdown-calculator/","Drawdown calculator"),("profit-target-calculator/","Profit target planner"),("futures-position-size-calculator/","Futures position size"),("plan-compare/","Manual plan comparison"),("directory/","All firms")]) + "</ul>"
            page(firm_path(r), r["name"]+" — Prop firm research profile", "Research status and manual calculators for "+r["name"]+".", profile, crumbs=[("Home",""),("Firm directory","directory/"),(r["name"],firm_path(r))])
        cards.append(f'<article class="directory-card card" data-category="{category}" data-status="{r["status"]}" data-name="{name.lower()}"><small>{category}</small><h3>{name}</h3><p class="note">{status}</p><a class="btn" href="{link}">{action}</a></article>')
    directory = f"""<section class="experience-hero"><div class="eyebrow">GLOBAL RESEARCH DIRECTORY</div><h1>Explore funded trading programs.</h1><p class="lede">Discover research targets and existing sourced presets. Listing is not proof of current availability or eligibility.</p><div class="metric-strip"><strong>{len(records)}</strong> research entries <span>•</span> <strong>{sum(r["status"]=="sourced-preset" for r in records)}</strong> existing preset entries</div></section><section class="filter-panel card"><div class="fields"><div><label for="directory-search">Search by name</label><input id="directory-search" type="text" placeholder="Search directory"></div><div><label for="directory-category">Category</label><select id="directory-category"><option value="">All categories</option>{opts}</select></div><div><label for="directory-status">Data status</label><select id="directory-status"><option value="">All statuses</option><option value="sourced-preset">Existing sourced preset</option><option value="partial-source">Partial official rules</option><option value="research-needed">Research pending</option></select></div></div><p id="directory-count" role="status"></p></section><div class="directory-grid" id="directory-grid">{''.join(cards)}</div><p class="note">Research entries are not endorsements. Check official terms before paying or applying.</p><script defer src="{url('expanded.js')}"></script>"""
    page("directory/", "Global prop firm research directory", "Search existing sourced presets and research targets.", directory)
    fields = [["accounts","Accounts"],["balance","Profit per account"],["buffer","Required retained profit"],["split","Trader share %"],["cap","Request cap per account (0 = none)"],["cost","Total evaluation and operating costs"],["fx","Conversion cost %"],["rate","Actual FX quote (destination per source)"]]
    controls = "".join(f'<div><label for="ws-{key}">{label}</label><input id="ws-{key}" data-field="{key}" type="number" min="0" step="any" required placeholder="Enter value"></div>' for key,label in fields)
    body = f"""<section class="experience-hero"><div class="eyebrow">INTERACTIVE WORKSPACE</div><h1>Model your account portfolio.</h1><p class="lede">Model aggregate payout requests, trader share and costs using your own account rules. All inputs must use a consistent source currency. No live rates or eligibility are implied.</p></section><section class="calc" id="expanded-workspace" data-mode="trader"><form class="card" id="workspace-form"><h2>Scenario inputs</h2><p class="note">Enter every field; use 0 where a fee or cost does not apply.</p><div class="fields">{controls}</div><button class="btn" type="submit">Calculate scenario</button></form><div class="card"><h2>Scenario analysis</h2><div id="workspace-result" aria-live="polite">Enter assumptions to calculate.</div><div id="workspace-chart" class="analysis-chart"></div><button id="workspace-export" type="button" class="btn" disabled>Download results CSV</button></div></section><section class="card"><h2>Related payout tools</h2><ul class="grid-links"><li><a href="{url('prop-firm-payout-calculator/')}">Single-account payout</a></li><li><a href="{url('global-traders/')}">International payout and country guide</a></li></ul><h2>Model boundaries</h2><p>The formula is a simplified manual model: requested profit is bounded by retained profit and the entered cap. It does not check drawdown, trading days, consistency, account status, regional restrictions or actual eligibility. FX is user-entered.</p></section><script defer src="{url('expanded.js')}"></script>"""
    page("workspace/", "Multi-account payout workspace", "Interactive manual financial scenario with explicit assumptions.", body)
    shutil.copy(ROOT / "src/expanded.js", DIST / "expanded.js")
