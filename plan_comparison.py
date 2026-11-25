"""Single selected account daily journal; sourced rules, explicit unknowns."""
import json, shutil
from expanded import firm_path
def build_plan_comparison(page,url,ROOT,DIST,checked):
    shutil.copy(ROOT/"src/plan-compare.js",DIST/"plan-compare.js")
    data=json.loads((ROOT/"data/prop.json").read_text())
    firms={f["name"]:f for f in data["firms"].values()}
    items=[]
    for r in json.loads((ROOT/"data/directory.json").read_text()):
        f=firms.get(r["name"],{})
        plans=[dict(p,days=p.get("min_days")) for p in f.get("plans",[])]+r.get("account_plans",[])
        if not plans:
            plans=[{"label":"2-Step · "+p[0],"target":str(p[1])+"%","dd":str(p[3])+"%","dll":str(p[2])+"%","days":p[4]} for p in r.get("plans",[])]
        if plans:items.append({"name":r["name"],"plans":plans,"profile":url(firm_path(r)),"source":r.get("source") or (f.get("sources") or [["",""]])[0][0]})
    payload=json.dumps(items,ensure_ascii=True).replace("<","\\u003c")
    body=f"""<h1>Plan analysis</h1><p class="lede">Select one account and record each completed trading day. Follow your cumulative P/L, profit target and evaluation consistency in a spreadsheet-style journal.</p>
<section id="plan-compare"><div class="fields"><div><label for="pc-firm">Prop firm</label><select id="pc-firm"></select></div><div><label for="pc-plan">Account / plan</label><select id="pc-plan"></select></div></div>
<p id="pc-rule" class="note"></p><p id="pc-context" class="note"></p><div class="kpis" id="pc-summary"></div>
<div class="journal-toolbar"><button class="btn" type="button" id="pc-add">+ Add trading day</button><button class="btn" type="button" id="pc-export">Download CSV</button><button class="btn" type="button" id="pc-clear">Clear journal</button></div>
<div class="table-scroll journal-scroll"><table class="journal-table"><thead><tr><th>Day</th><th>Date (optional)</th><th>Net P/L (USD)</th><th>Commission (USD)</th><th>Cumulative net</th><th>Best day share</th><th>Profit remaining</th><th>Rule check</th><th>Notes</th></tr></thead><tbody id="pc-days"></tbody></table></div>
<p id="pc-status" role="status" class="note"></p><p class="note">Blank P/L rows are not trading days. Enter net P/L after commissions. Commission add-back applies only where the selected evaluation rule explicitly uses before-commission P/L. Enter zero if already on that basis. The journal does not test intraday drawdown, daily loss breaches, payout windows or funded-stage rules; use your firm dashboard. Values remain in USD to match account rules.</p><p><a id="pc-profile" href="{url('directory/')}">Account profile and rules</a></p></section>
<script type="application/json" id="pc-data">{payload}</script><script defer src="{url('plan-compare.js')}"></script>"""
    page("plan-compare/","Single-account trading journal | PropFirmMath","Track one selected prop firm account with daily profit and loss and evaluation progress.",body,crumbs=[("Home",""),("Plan analysis","plan-compare/")])
