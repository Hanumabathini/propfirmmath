"""Country-aware payout tracker; never assumes regional eligibility or live FX."""
import shutil,json,html
from expanded import firm_path
def build_global_traders(page,url,ROOT,DIST,checked):
    shutil.copy(ROOT/"src/global-traders.js",DIST/"global-traders.js")
    records=json.loads((ROOT/"data/directory.json").read_text())
    firms={f["name"]:f for f in json.loads((ROOT/"data/prop.json").read_text())["firms"].values()}
    entries=[]
    for r in records:
        f=firms.get(r["name"],{})
        plans=[{"label":p.get("label",str(p.get("size",""))),"price":p.get("price","Not verified"),"target":p.get("target"),"dd":p.get("dd"),"dd_type":p.get("dd_type"),"dll":p.get("dll"),"contracts":p.get("contracts"),"days":p.get("min_days"),"consistency":p.get("consistency")} for p in f.get("plans",[])]
        plans.extend(r.get("account_plans",[]))
        plans += [{"label":"2-Step · "+p[0],"price":"Not verified","target":str(p[1])+"%","dd":str(p[3])+"%"} for p in ([] if r.get("account_plans") else r.get("plans",[]))]
        entries.append({"name":r["name"],"category":r["category"],"status":r["status"],"profile":url(firm_path(r)),"summary":r.get("summary",f.get("summary","")),"payout":f.get("payout",[]),"plans":plans or [{"label":"Custom / not verified","price":"Not verified"}]})
    payload=json.dumps(entries,ensure_ascii=True).replace("<","\\u003c")
    body=f"""<h1>Global trackers</h1><p class="lede">Choose your country, browse firm accounts and estimate your payout in your local currency. Regional approval and live checkout pricing are not implied.</p>
<section class="card"><h2 style="margin-top:0">Country and account</h2><div class="fields">
<div><label for="gt-country">Country of residence</label><select id="gt-country"><option value="">Select country</option></select></div>
<div><label for="gt-currency">Receiving currency</label><select id="gt-currency"></select></div>
<div><label for="gt-firm">Prop firm</label><select id="gt-firm"></select></div>
<div><label for="gt-plan">Account / plan</label><select id="gt-plan"></select></div>
</div><p id="gt-eligibility" class="note" role="status"></p><p id="gt-plan-price" class="note"></p><p><a id="gt-profile" href="{url('directory/')}">View firm profile</a> · <a id="gt-policy" href="{url('directory/')}">Review regional rules</a></p></section>
<section class="calc" id="global-traders" style="margin-top:20px">
<div class="card"><h2 style="margin-top:0">Payout scenario</h2><div class="fields">
<div><label for="gt-gross">Gross approved payout, USD</label><input id="gt-gross" type="number" min="0" step=".01" value="2000"></div>
<div><label for="gt-split">Trader payout share, % (manual)</label><input id="gt-split" type="number" min="0" max="100" step=".1" value="90"></div>
<div><label for="gt-transfer">Bank / transfer fees, USD</label><input id="gt-transfer" type="number" min="0" step=".01" value="0"></div>
<div><label for="gt-tax">Estimated withholding, % (optional)</label><input id="gt-tax" type="number" min="0" max="100" step=".1" value="0"></div>
<div class="full"><label for="gt-fx">Provider FX quote (receiving currency per USD)</label><input id="gt-fx" type="number" min="0" step="any" placeholder="Enter actual quote"></div>
<div class="full"><label for="gt-markup">Extra conversion cost, % (0 if included)</label><input id="gt-markup" type="number" min="0" max="100" step=".1" value="0"></div>
</div><p class="note">Enter an approved gross payout, not the account balance. The split and costs are your assumptions, not automatically verified plan rules.</p></div>
<div class="card" aria-live="polite"><h2 style="margin-top:0">Estimated local payout</h2><p id="gt-status" class="note"></p><div id="gt-total" class="big">—</div><div class="kpis"><div class="kpi"><small>Trader share, USD</small><b id="gt-share">—</b></div><div class="kpi"><small>After USD charges</small><b id="gt-net">—</b></div><div class="kpi"><small>Effective FX rate</small><b id="gt-rate">—</b></div></div></div></section>
<section class="card" id="gt-overview" style="margin-top:20px"><h2>Selected account overview</h2><div id="gt-accounts" aria-live="polite"></div></section><p class="note">Only firms with a reviewed, non-partial country policy and no identified residence restriction appear in the selector. Final eligibility is subject to citizenship, KYC and plan rules. Other research entries remain in the Directory.</p><script type="application/json" id="gt-data">{payload}</script><script defer src="{url('global-traders.js')}"></script>"""
    page("global-traders/","Global trackers | PropFirmMath","Country-aware firm account research and international payout calculator.",body,crumbs=[("Home",""),("Global trackers","global-traders/")])
