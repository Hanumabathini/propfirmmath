"""Build a selectable, source-aware firm and plan comparison."""
import json, html, shutil
from expanded import firm_path

def build_firm_compare(page,url,ROOT,DIST,D,CHK,WARN):
    e=html.escape
    missing="Not verified"
    records=json.loads((ROOT/"data/directory.json").read_text())
    firms={f["name"]:f for f in D["firms"].values()}
    data=[]
    for r in records:
        f=firms.get(r["name"],{})
        plans=[]
        for p in f.get("plans",[]):
            plans.append({"label":p.get("label",str(p.get("size",""))),"price":p.get("price",missing),"target":f'${p["target"]:,}' if p.get("target") is not None else missing,"dd":f'${p["dd"]:,}' if p.get("dd") is not None else missing,"dd_type":p.get("dd_type",missing),"dll":p.get("dll",missing),"contracts":p.get("contracts",missing),"days":str(p["min_days"]) if p.get("min_days") is not None else missing,"consistency":p.get("consistency",missing)})
        for phase,target,daily,dd,days in r.get("plans",[]):
            plans.append({"label":"2-Step · "+phase,"target":str(target)+"%","dd":str(dd)+"%","dll":str(daily)+"%","days":str(days)})
        if not plans:
            plans=[{"label":"Research profile","consistency":r.get("summary",missing) if r.get("consistency") else missing}]
        data.append({"name":r["name"],"category":r["category"],"status":r["status"],"profile":url(firm_path(r)),"plans":plans,"payout":f.get("payout",[]),"sources":f.get("sources",[]) or ([[r["source"],"Official rules"]] if r.get("source") else []),"checked":r.get("checked",CHK if f.get("verified") else missing)})
    options='<option value="">Choose firm</option>'+"".join(f'<option value="{i}">{e(f["name"])}</option>' for i,f in enumerate(data))
    defaults=[next(i for i,f in enumerate(data) if f["name"]==n) for n in ["Topstep","Tradeify"]]
    slots=[]
    for j in range(2):
        value=str(defaults[j])
        opts=options.replace('value="'+value+'"','value="'+value+'" selected',1)
        slots.append(f'<div class="compare-slot card"><h3>Account {"AB"[j]}</h3><label for="fc-firm-{j}">Prop firm</label><select id="fc-firm-{j}" data-firm="{j}">{opts}</select><label for="fc-plan-{j}">Account / plan</label><select id="fc-plan-{j}" data-plan="{j}"></select></div>')
    payload=json.dumps(data,ensure_ascii=True).replace("<","\\u003c")
    body=f"""<h1>Compare firms and account plans</h1><p class="lede">Compare two accounts from different firms or two plans from the same firm. Compare published prices, evaluation requirements and payout notes without mixing rules across plans.</p><section class="compare-selectors" aria-label="Comparison selections">{''.join(slots)}</section><p class="note">Published prices may be recurring, one-time, promotional or exclude activation and reset fees. Unverified entries do not imply zero cost or unrestricted trading.</p><div class="table-scroll"><table class="compare interactive-compare" id="fc-table"><thead></thead><tbody></tbody></table></div><p id="fc-status" role="status" class="note"></p><button class="btn" id="fc-reset" type="button">Reset comparison</button>{WARN}<p><a href="{url('plan-compare/')}">Analyze consistency against your trading days</a> · <a href="{url('directory/')}">Browse all firm profiles</a></p><script type="application/json" id="fc-data">{payload}</script><script defer src="{url('firm-compare.js')}"></script>"""
    page("prop-firm-comparison/","Compare prop firms and plans | PropFirmMath","Select firms and plans to compare fees, profit targets, drawdown and payout rules.",body,crumbs=[("Home",""),("Compare firms","prop-firm-comparison/")])
    shutil.copy(ROOT/"src/firm-compare.js",DIST/"firm-compare.js")
