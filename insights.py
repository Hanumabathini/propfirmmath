"""Plan finder, best-for guides, firm vs firm pages, glossary and the deals slot.

Every number shown here is a firm's own published rule text from data/prop.json, quoted with its
sources and the date it was read. Traits used for grouping and matching come from src/plan-match.js,
so the browser finder and these pages agree. Nothing is ranked by payment.
"""
import datetime, json, subprocess


def load_plan_data(root):
    """Ask src/plan-match.js for the traits, groups and firm differences built from data/prop.json."""
    js = ("const PM=require(process.argv[1]),D=require(process.argv[2]);const L=PM.allTraits(D.firms);"
          "console.log(JSON.stringify({traits:L,questions:PM.QUESTIONS,defaults:PM.DEFAULTS,categories:PM.categories(L).map(c=>({path:c.path,title:c.title,short:c.short,lede:c.lede,plans:c.plans})),"
          "pairs:PM.pairs(L).map(([a,b])=>({a,b,diff:PM.differences(L,a,b)}))}))")
    out = subprocess.run(["node", "-e", js, str(root / "src/plan-match.js"), str(root / "data/prop.json")],
                         check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def validate_deals(deals, firms, today):
    """Return only deals we can stand behind: a sourced firm, its own source, a read date and an expiry
    that hasn't passed. Anything else is an error, so a bad entry stops the build instead of going live."""
    ok = []
    for i, d in enumerate(deals):
        where = f"data/deals.json entry {i + 1}"
        for key in ("firm", "title", "source", "checked", "expires"):
            if not str(d.get(key, "")).strip():
                raise ValueError(f"{where}: missing {key}")
        f = firms.get(d["firm"])
        if not f or not f.get("verified"):
            raise ValueError(f"{where}: {d['firm']} has no sourced rules")
        if not str(d["source"]).startswith("https://"):
            raise ValueError(f"{where}: source must be an https link to the firm's own page")
        checked = datetime.date.fromisoformat(d["checked"])
        expires = datetime.date.fromisoformat(d["expires"])
        if checked > today:
            raise ValueError(f"{where}: checked date is in the future")
        if expires >= today:
            ok.append(d)
    return ok


def build_insights(page, url, esc, root, dist, checked, aff, faq_html, faq_schema, app_schema):
    data = json.loads((root / "data/prop.json").read_text())
    firms = data["firms"]
    pd = load_plan_data(root)
    traits, cats, pairs = pd["traits"], pd["categories"], pd["pairs"]
    names = {k: f["name"] for k, f in firms.items()}
    rules_path = {k: f["slug"] + "/" for k, f in firms.items() if f.get("verified")}
    deals = validate_deals(json.loads((root / "data/deals.json").read_text()).get("deals", []), firms, datetime.date.today())

    def sources(keys):
        items = "".join(f'<li>{esc(names[k])}: <a href="{esc(u)}" rel="noopener" target="_blank">{esc(t)}</a></li>'
                        for k in keys for u, t in firms[k]["sources"][:3])
        return f"<h2>Sources</h2><p class=note>Each rule above is quoted from the firm's own pages, read {esc(checked)}. Firms change rules often: check the firm's page before you buy.</p><ul>{items}</ul>"

    def deals_html(keys):
        # Empty until real, sourced offers exist; renders nothing rather than a placeholder box.
        rows = [d for d in deals if d["firm"] in keys]
        if not rows:
            return ""
        items = "".join(f'<li><b>{esc(names[d["firm"]])}:</b> {esc(d["title"])} <span class=note>(read {esc(d["checked"])}, ends {esc(d["expires"])}, <a href="{esc(d["source"])}" rel="noopener" target="_blank">firm\'s page</a>)</span></li>' for d in rows)
        return f"<section class=card><h2 style='margin-top:0'>Current offers</h2><ul>{items}</ul><p class=note>Offers come from each firm's own page on the date shown and can end early.</p></section>"

    def visit(k):
        if not aff.get(k):
            return ""
        return f' · <a href="{esc(aff[k])}" rel="sponsored noopener" target=_blank>Visit {esc(names[k])}</a> <span class=note>(affiliate link)</span>'

    def watch(t):
        out = []
        if t["payoutPct"] is not None:
            out.append(f"Best day at most {t['payoutPct']}% for payouts")
        if t["intradayFunded"]:
            out.append("Intraday trailing once funded")
        if t["pricing"] == "unpublished":
            out.append("Price not published per size")
        if t["pricing"] == "monthly":
            out.append("Billed monthly until you pass")
        return "; ".join(out) or "None in the published rules"

    def plan_table(plans, extra=True):
        head = "<tr><th>Plan</th><th>Price</th><th>Consistency</th><th>Drawdown</th><th>Daily loss limit</th><th>Min days</th>" + ("<th>Watch for</th>" if extra else "") + "</tr>"
        rows = "".join(
            f'<tr><td><a href="{url(rules_path[t["firm"]])}">{esc(t["firmName"])} {esc(t["label"])}</a></td><td>{esc(t["rule"]["price"])}</td>'
            f'<td>{esc(t["rule"]["consistency"])}</td><td>{esc(t["rule"]["dd"])}</td><td>{esc(t["rule"]["dll"])}</td>'
            f'<td>{esc(str(t["rule"]["minDays"]))}</td>' + (f"<td>{esc(watch(t))}</td>" if extra else "") + "</tr>" for t in plans)
        return f"<div class=table-scroll><table><thead>{head}</thead><tbody>{rows}</tbody></table></div>"

    hub_links = ("<h2>Keep going</h2><ul class=grid-links>"
                 f"<li><a href='{url('plan-finder/')}'>Plan finder<small>Seven questions about how you trade, matched to published rules.</small></a></li>"
                 f"<li><a href='{url('best-for/')}'>Plans by rule<small>Groups of plans that share a rule you care about.</small></a></li>"
                 + f"<li><a href='{url('prop-firm-glossary/')}'>Glossary<small>Plain definitions of prop firm terms.</small></a></li>"
                 f"<li><a href='{url('consistency-rule-calculator/')}'>Consistency rule calculator<small>Check your own best day against a limit.</small></a></li></ul>")

    vs_pages = []
    for p in pairs:
        a, b = p["a"], p["b"]
        slug = f"{firms[a]['slug'].removesuffix('-rules')}-vs-{firms[b]['slug'].removesuffix('-rules')}/"
        vs_pages.append((slug, a, b, p["diff"]))
    vs_links = "".join(f"<li><a href='{url(s)}'>{esc(names[a])} vs {esc(names[b])}<small>Side by side on published rules.</small></a></li>" for s, a, b, _ in vs_pages)
    hub_links = hub_links.replace("</ul>", vs_links + "</ul>", 1)

    # ---- plan finder
    qs = ""
    for q in pd["questions"]:
        opts = "".join(
            f'<label class=finder-opt><input type=radio name="{esc(q["k"])}" value="{esc(v)}" id="pf-{esc(q["k"])}-{esc(v)}"'
            + (" checked" if v == pd["defaults"][q["k"]] else "")
            + f"> {esc(label)}</label>" for v, label in q["a"])
        qs += f'<fieldset class=finder-q><legend>{esc(q["q"])}</legend>{opts}</fieldset>'
    links = {k: {"rules": url(rules_path[k]), "visit": aff.get(k, "")} for k in rules_path}
    blob = lambda o: json.dumps(o, separators=(",", ":")).replace("</", "<\\/")
    finder_qa = [
        ("How does the plan finder pick plans?", "It compares your answers with each plan's published rules: the evaluation consistency limit, whether there is an evaluation, the daily loss limit, how the drawdown trails, how you pay, the minimum days and the profit split. Plans that break an answer drop down the list."),
        ("Is the order paid for?", "No. The order comes only from the rules. Some links may be affiliate links, and they're labelled; they don't change the order."),
        ("Why are only three firms included?", "We only match plans whose rules we could read on the firm's own pages. Other firms are in the directory without numbers until we can source them."),
        ("Can I share my results?", "Yes. Your answers are saved in the page address, so copying it shares the same answers and results.")]
    page("plan-finder/", "Prop Firm Plan Finder: Which Futures Plan Fits How You Trade | PropFirmMath",
         "Answer seven questions about how you trade and see which sourced Topstep, Tradeify and MyFundedFutures plans fit, with the reasons and the rules to watch.",
         f"""<h1>Which plan fits how you trade?</h1><p class=lede>Seven questions about your trading, matched against each plan's published rules. You see why a plan fits and what to watch for. Nothing here is ranked by payment.</p>
<div id=plan-finder class=finder><form class="card finder-form">{qs}</form><div class=finder-results aria-live=polite><p>Pick your answers to see your closest plans.</p></div></div>
<noscript><div class=warn>The plan finder needs JavaScript. You can still browse <a href="{url('best-for/')}">plans by rule</a>.</div></noscript>
<script type=application/json id=plan-data>{blob(traits)}</script><script type=application/json id=plan-links>{blob(links)}</script>
<div class=warn>Matches use each firm's published rules read {esc(checked)}. They're a starting point, not advice: read the full rules and check the firm's site before you buy.</div>
{faq_html(finder_qa)}{hub_links}<script src="{url('plan-match.js')}"></script>""",
         [faq_schema(finder_qa), app_schema("Prop firm plan finder", "plan-finder/", "Matches futures prop firm plans to how you trade, using published rules.")],
         crumbs=[("Home", ""), ("Plan finder", "plan-finder/")])

    # ---- best-for groups
    cards = "".join(f"<li><a href='{url('best-for/' + c['path'] + '/')}'>{esc(c['short'])}<small>{len(c['plans'])} sourced plans</small></a></li>" for c in cats)
    page("best-for/", "Futures Prop Firm Plans by Rule | PropFirmMath",
         "Futures prop firm plans grouped by the rule you care about: no consistency rule, end-of-day drawdown, no daily loss limit, one-time fee, one-day passing and a 90% split.",
         f"""<h1>Prop firm plans by rule</h1><p class=lede>Each group lists the sourced plans that share one rule, with the rule text quoted from the firm. A group needs at least two plans before it gets a page.</p>
<ul class=grid-links>{cards}</ul>{deals_html(rules_path.keys())}{hub_links}""",
         crumbs=[("Home", ""), ("Plans by rule", "best-for/")])
    for c in cats:
        keys = sorted({t["firm"] for t in c["plans"]}, key=list(rules_path).index)
        qa = [("Where do these rules come from?", f"From each firm's own help and plan pages, read {checked}. Each firm's sources are listed at the bottom of this page."),
              ("Is this list ranked?", "No. Plans are listed by firm in a fixed order, not by payment or rating. Use the plan finder to sort plans by how you trade."),
              ("Is a plan in this group always the better choice?", "No. One rule never tells the whole story. Check the other columns, and the payout rules on each firm's page, before you choose.")]
        page(f"best-for/{c['path']}/", f"{c['title']} | PropFirmMath",
             f"{c['short']}: {len(c['plans'])} sourced futures prop firm plans from {', '.join(names[k] for k in keys)}, with each rule quoted from the firm and the date it was read.",
             f"""<h1>{esc(c['title'])}</h1><p class=lede>{esc(c['lede'])}</p>
<p>{len(c['plans'])} sourced plans fit, from {esc(', '.join(names[k] for k in keys))}. Rules read {esc(checked)}.</p>
{plan_table(c['plans'])}{deals_html(keys)}
<p><a class=btn href="{url('plan-finder/')}">Match plans to how you trade</a></p>
{faq_html(qa)}{sources(keys)}{hub_links}""",
             [faq_schema(qa)], crumbs=[("Home", ""), ("Plans by rule", "best-for/"), (c["short"], f"best-for/{c['path']}/")])

    # ---- firm vs firm
    for slug, a, b, diff in vs_pages:
        na, nb = names[a], names[b]
        plans = [t for t in traits if t["firm"] in (a, b)]
        qa = [(f"Is {na} or {nb} better?", "It depends on how you trade. The differences above come only from each firm's published rules; the plan finder matches them to your own answers."),
              ("How current is this?", f"Both firms' rules were read from their own pages on {checked}. Firms change rules often, so check before you buy."),
              ("Which plans are compared?", f"Every {na} and {nb} plan whose rules we could source, at the sizes the firms publish.")]
        diffs = "".join(f"<li>{esc(d)}</li>" for d in diff)
        page(slug, f"{na} vs {nb}: Rules Compared Side by Side | PropFirmMath",
             f"{na} vs {nb} on published rules: pricing, consistency, drawdown, daily loss limit, minimum days and profit split, quoted from each firm with sources.",
             f"""<h1>{esc(na)} vs {esc(nb)}</h1><p class=lede>The two firms side by side on their published rules, read {esc(checked)}. No ratings and no paid order: just what each firm's own pages say.</p>
<section class=card><h2 style='margin-top:0'>Where they differ</h2><ul>{diffs}</ul></section>
<h2>Every sourced plan</h2>{plan_table(plans)}{deals_html((a, b))}
<p><a href="{url(rules_path[a])}">Full {esc(na)} rules</a>{visit(a)} · <a href="{url(rules_path[b])}">Full {esc(nb)} rules</a>{visit(b)}</p>
<p><a class=btn href="{url('plan-finder/')}">Match plans to how you trade</a></p>
{faq_html(qa)}{sources((a, b))}{hub_links}""",
             [faq_schema(qa)], crumbs=[("Home", ""), ("Compare firms", "prop-firm-comparison/"), (f"{na} vs {nb}", slug)])

    # ---- glossary (general definitions, no firm numbers)
    terms = [
        ("Evaluation", "A trial account you pay for. Reach the profit target without breaking the rules and you move to a funded account."),
        ("Funded account", "An account where profits can be paid out to you under the firm's payout rules. Many are simulated accounts with real payouts."),
        ("Profit target", "The profit an evaluation needs before you pass."),
        ("Maximum drawdown", "How far the account can fall from a reference balance before it fails."),
        ("End-of-day trailing drawdown", "A failure level that moves up with your highest closing balance. Swings during the day don't move it."),
        ("Intraday trailing drawdown", "A failure level that follows your highest balance at any moment, open profit included. A winning trade you give back still raises it."),
        ("Static drawdown", "A failure level that stays at the starting balance minus the drawdown, however well you do."),
        ("Drawdown lock", "The point where a trailing failure level stops moving, often at or just above the starting balance."),
        ("Daily loss limit", "A cap on one day's losses. Depending on the firm, hitting it fails the account or only ends trading for the day."),
        ("Consistency rule", "A cap on how much of your total profit can come from one day. Some firms use it in the evaluation, some only for payouts."),
        ("Minimum trading days", "The fewest days you must trade before you can pass an evaluation or ask for a payout."),
        ("Profit split", "The share of each payout you keep. A 90/10 split means you keep 90%."),
        ("Payout buffer", "Profit that must stay in a funded account above its failure level before you can withdraw. Some firms call it a safety net."),
        ("Activation fee", "A one-time fee some firms charge when you move from a passed evaluation to a funded account."),
        ("Reset", "Paying to restart an evaluation from the starting balance after breaking a rule."),
        ("Instant funding", "A plan with no evaluation: you start in a funded account, usually with tighter payout rules."),
        ("Contract limit", "The most contracts you can hold at once, often lower until the account grows."),
        ("Scaling plan", "A schedule that raises your contract limit as your balance grows."),
    ]
    slug_of = lambda t: "term-" + t.lower().replace(" ", "-").replace("/", "-")
    dl = "".join(f'<dt id="{slug_of(t)}">{esc(t)}</dt><dd>{esc(d)}</dd>' for t, d in terms)
    gschema = {"@context": "https://schema.org", "@type": "DefinedTermSet", "name": "Prop firm glossary",
               "hasDefinedTerm": [{"@type": "DefinedTerm", "name": t, "description": d} for t, d in terms]}
    page("prop-firm-glossary/", "Prop Firm Glossary: Drawdown, Consistency and Payout Terms | PropFirmMath",
         "Plain definitions of prop firm terms: evaluation, trailing drawdown, drawdown lock, daily loss limit, consistency rule, profit split, payout buffer and more.",
         f"""<h1>Prop firm glossary</h1><p class=lede>The terms you'll meet in prop firm rules, in plain words. Each firm defines them in its own way, so its rules page is the final word.</p>
<dl class="card glossary">{dl}</dl>{hub_links}""",
         [gschema], crumbs=[("Home", ""), ("Glossary", "prop-firm-glossary/")])

    (dist / "plan-match.js").write_text((root / "src/plan-match.js").read_text())
    return {"categories": cats, "vs": [(s, names[a], names[b]) for s, a, b, _ in vs_pages], "plans": len(traits)}
