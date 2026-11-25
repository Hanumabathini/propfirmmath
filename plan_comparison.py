"""Compare the same daily results across verified, account-stage-specific rules; no invented firm thresholds."""
import json, shutil
def build_plan_comparison(page,url,ROOT,DIST,checked):
    shutil.copy(ROOT/"src/plan-compare.js",DIST/"plan-compare.js")
    data=json.loads((ROOT/"data/prop.json").read_text())
    items=[]
    for key,firm in data["firms"].items():
        if not firm.get("verified"): continue
        source=firm.get("sources",[[]])[0][0] if firm.get("sources") else ""
        for label,vals in firm.get("presets",{}).get("consistency",[]):
            pct=vals.get("rulePct")
            if not isinstance(pct,(int,float)) or pct <= 0: continue
            items.append({"id":key+"-"+str(len(items)),"firm":firm["name"],"label":label,"percent":pct,"source":source,"checked":data["checked"],"basis":"before-commission" if key=="tradeify" else "net"})
    (DIST/"consistency-plans.json").write_text(json.dumps(items,separators=(",",":")))
    body='''<h1>Same trading days. Different firm rules.</h1>
<p class="lede">Compare your daily results across specific evaluation and funded consistency presets. Calculate the ratio, the profit still needed and the exact source—without confusing a mathematical result with payout eligibility.</p>
<div class="warn"><strong>A ratio is not approval.</strong> Account stage, payout path, eligible day counts, purchase date and firm policy version can change requirements. All presets were sourced from official firm pages on '''+checked+'''. Verify against your dashboard. If a plan has no consistency condition, it is intentionally not listed.</div>
<section class="calc" id="plan-compare">
<div class="card"><h2 style="margin-top:0">Enter trading-day data</h2>
<div class="fields">
<div class="full"><label for="pc-days">Daily net P/L (one number per line, including losses)</label><textarea id="pc-days" rows="7">600
-300
1200
400
500</textarea></div>
<div class="full"><label for="pc-fees">Optional daily commissions to add back for Tradeify calculations (same number of days)</label><textarea id="pc-fees" rows="5" placeholder="Leave blank if your input already excludes commissions, or enter one amount per day"></textarea></div>
<div class="full"><label for="pc-a">Plan A</label><select id="pc-a"></select></div>
<div class="full"><label for="pc-b">Plan B</label><select id="pc-b"></select></div>
<div class="full"><label for="pc-c">Plan C</label><select id="pc-c"></select></div>
</div><p class="note">Treat each input as a single *firm-defined trading day*, not a calendar day. Tradeify's rule can use a before-commissions basis. Enter the actual daily fees separately only if daily P/L includes them, and only when applicable to your account.</p></div>
<div class="card" aria-live="polite"><h2 style="margin-top:0">Rule comparison</h2>
<p class="note" id="pc-status"></p><div id="pc-results"></div>
</div></section>
<h2>How the analysis works</h2><p>Best profitable day divided by the selected window's total eligible profit. If below a plan's threshold, the ratio meets that mathematical condition; otherwise required total profit is best day divided by that threshold. At a strict less-than limit, equality alone may not qualify—check the firm's source. This tool uses inclusive arithmetic as an illustration.</p>
<h2>Why it matters</h2><p>Competitors offer dozens of plan tables; our focus is showing each confirmed rule's <strong>scope, profit basis, source and calculated consequence</strong>. Never mistake a 40% evaluation rule for a 40% funded payout rule.</p>
<script src="'''+url("plan-compare.js")+'''"></script>'''
    page("plan-compare/","Compare prop-firm consistency plans side by side | PropFirmMath","Compare up to three sourced Topstep, Tradeify and MyFundedFutures consistency plans against your own day-by-day P/L.",body,crumbs=[("Home",""),("Plan analysis","plan-compare/")])
