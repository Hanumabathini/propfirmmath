"""Funded-trader pages for PropFirmMath. Called from build.py with its helpers."""
import datetime, json, shutil, subprocess

WARN = ("<div class=warn><b>Planning estimates, not payout eligibility or trading authorization.</b> "
        "Your firm, account product, activation/purchase date, payout path, winning days, "
        "contract limits, trailing loss rules and prior withdrawals can change the result. "
        "Confirm every requirement in your firm's dashboard and official rules before acting.</div>")

def build_prop(h):
    page, url, ROOT, DIST = h["page"], h["url"], h["ROOT"], h["DIST"]
    esc = lambda v: h["esc"](str(v))
    faq_html, faq_schema, app_schema = h["faq_html"], h["faq_schema"], h["app_schema"]
    D = json.loads((ROOT / "data/prop.json").read_text())
    CHK = datetime.date.fromisoformat(D["checked"]).strftime("%B %-d, %Y")
    YEAR = D["checked"][:4]
    F = D["firms"]
    OK = [k for k in F if F[k].get("verified")]
    for f in ("prop.js", "prop-ui.js"):
        shutil.copy(ROOT / "src" / f, DIST / f)
    contracts = json.loads(subprocess.run(["node", "-e", "console.log(JSON.stringify(require(process.argv[1]).CONTRACTS))", str(ROOT / "src/prop.js")],
                                           check=True, capture_output=True, text=True).stdout)
    m = lambda n: f"${n:,.0f}"

    FIELDS = {
        "consistency": [("days", "Daily profit and loss, one day per line", "textarea", "450\n300\n-150\n600\n250"),
                        ("rulePct", "Best-day limit, % of total profit", "number", 50)],
        "payout": [("balance", "Account balance now", "number", 53500), ("start", "Starting balance", "number", 50000),
                   ("buffer", "Buffer that must stay above it", "number", 0), ("split", "Your profit split %", "number", 90),
                   ("minPayout", "Minimum payout (0 if none)", "number", 0), ("maxPayout", "Payout cap (0 if none)", "number", 0),
                   ("maxPct", "Max % of balance per request (0 if none)", "number", 0), ("request", "Amount you want (0 for the most allowed)", "number", 0)],
        "drawdown": [("type", "Drawdown type", "select", [("eod", "End-of-day trailing"), ("intraday", "Intraday trailing"), ("static", "Static")]),
                     ("start", "Starting balance", "number", 50000), ("amount", "Drawdown amount", "number", 2000),
                     ("peak", "Highest balance so far", "number", 51200), ("balance", "Balance now", "number", 50700),
                     ("lockAt", "Trailing stops at this level (0 if never)", "number", 50000)],
        "target": [("target", "Profit target", "number", 3000), ("current", "Profit so far", "number", 1200),
                   ("days", "Trading days you want to use", "number", 5), ("rulePct", "Best-day limit % (0 if none)", "number", 50),
                   ("bestDay", "Your best day so far", "number", 700), ("minDays", "Minimum trading days (0 if none)", "number", 0),
                   ("tradedDays", "Days traded so far", "number", 3)],
        "size": [("symbol", "Contract", "select", [(k, f"{k}, {v[0]}") for k, v in contracts.items()]),
                 ("stop", "Stop distance", "number", 10), ("unit", "Stop measured in", "select", [("points", "Points"), ("ticks", "Ticks")]),
                 ("risk", "Most you'll risk on the trade ($)", "number", 250), ("maxContracts", "Your firm's contract limit (0 if none)", "number", 0)],
    }
    SEL_DEFAULT = {"size-symbol": "MES"}
    TITLES = {"consistency": "Your days", "payout": "Your funded account", "drawdown": "Your account",
              "target": "Your evaluation", "size": "Your trade"}

    def presets(mode):
        out = []
        for k in OK:
            for label, v in F[k].get("presets", {}).get(mode, []):
                out.append((label, v, f"Preset from <a href='{url(F[k]['slug'] + '/')}'>{esc(F[k]['name'])}'s rules</a>, read {CHK}. Check them with {esc(F[k]['name'])} before you rely on it."))
        return out

    def calc(mode, set_to=None, title=None):
        vals = {}
        pre = presets(mode)
        if set_to is not None and pre:
            vals = pre[set_to][1]
        rows = []
        for k, label, kind, dv in FIELDS[mode]:
            v = vals.get(k, dv)
            fid = f"{mode}-{k}"
            if kind == "textarea":
                inp = f"<textarea id={fid} data-k={k} rows=6>{esc(v)}</textarea>"
                rows.append(f"<div class=full><label for={fid}>{esc(label)}</label>{inp}</div>")
                continue
            if kind == "select":
                v = vals.get(k, SEL_DEFAULT.get(fid, dv[0][0]))
                opts = "".join(f"<option value='{esc(o)}'{' selected' if o == v else ''}>{esc(t)}</option>" for o, t in dv)
                inp = f"<select id={fid} data-k={k}>{opts}</select>"
            else:
                inp = f"<input id={fid} data-k={k} type=number step=any value='{esc(v)}' inputmode=decimal>"
            rows.append(f"<div><label for={fid}>{esc(label)}</label>{inp}</div>")
        pick = ""
        if pre:
            opts = "<option value=''>Pick a firm's rules (optional)</option>" + "".join(
                f"<option value={i} data-v='{esc(json.dumps(v))}' data-src=\"{esc(src)}\"{' selected' if i == set_to else ''}>{esc(l)}</option>"
                for i, (l, v, src) in enumerate(pre))
            src0 = pre[set_to][2] if set_to is not None else ""
            pick = (f"<div class=full><label for={mode}-preset>Start from a firm</label><select id={mode}-preset class=preset>{opts}</select>"
                    f"<p class='note preset-src'>{src0}</p></div>")
        return (f"<section class=calc data-prop={mode}><div class=card><h2 style='margin-top:0'>{esc(title or TITLES[mode])}</h2>"
                f"<div class=fields>{pick}{''.join(rows)}</div></div>"
                f"<div class=card aria-live=polite><div class=result></div></div></section>")

    AFF = h.get("aff", {})
    def aff_btn(k, n):
        if not AFF.get(k):
            return ""
        return (f"<div class=cta><b>Thinking of trying {esc(n)}?</b><p>Read the rules above first, then start from their site.</p>"
                f"<a class=btn href='{esc(AFF[k])}' rel='sponsored noopener' target=_blank>Visit {esc(n)}</a>"
                f"<p class=note>This is an affiliate link: if you buy through it we may earn a commission at no cost to you.</p></div>")
    SCRIPTS = f"<script src=\"{url('prop.js')}\"></script><script src=\"{url('prop-ui.js')}\"></script>"
    HUB = ("Prop firm calculators", "prop-firm-calculator/")

    def tool_page(path, title, desc, h1, lede, mode, explain, qa, name):
        body = (f"<h1>{esc(h1)}</h1><p class=lede>{lede}</p>{calc(mode)}{WARN}{explain}"
                f"{faq_html(qa)}{more_tools(path)}{SCRIPTS}")
        page(path, title, desc, body, [app_schema(name, path, desc), faq_schema(qa)],
             crumbs=[("Home", ""), (h1, path)])

    TOOLS = [
        ("consistency-rule-calculator/", "Consistency rule calculator", "Check your best day against your firm's limit."),
        ("prop-firm-payout-calculator/", "Payout calculator", "See what you can withdraw and what reaches you."),
        ("trailing-drawdown-calculator/", "Trailing drawdown calculator", "Find where the account fails and the room left."),
        ("profit-target-calculator/", "Profit target planner", "Plan the daily profit to pass, inside the rules."),
        ("futures-position-size-calculator/", "Futures position size calculator", "Contracts to trade for the dollars you risk."),
        ("prop-firm-comparison/", "Prop firm comparison", "Topstep, Tradeify and MyFundedFutures side by side."),
    ]

    def more_tools(skip=None):
        items = "".join(f"<li><a href='{url(p)}'>{esc(n)}</a></li>" for p, n, _ in TOOLS if p != skip)
        firms = "".join(f"<li><a href='{url(F[k]['slug'] + '/')}'>{esc(F[k]['name'])} rules</a></li>" for k in OK)
        return f"<h2>More tools for funded traders</h2><ul class=grid-links>{items}{firms}</ul>"

    # ---- hub
    desc = "Free prop firm calculators for funded futures traders: consistency rule, payout, trailing drawdown, profit target and position size, with Topstep, Tradeify and MyFundedFutures presets."
    cards = "".join(f"<li><a href='{url(p)}'>{esc(n)}<small>{esc(s)}</small></a></li>" for p, n, s in TOOLS)
    firms = "".join(f"<li><a href='{url(F[k]['slug'] + '/')}'>{esc(F[k]['name'])} rules<small>{esc(F[k]['summary'][:90])}</small></a></li>" for k in OK)
    qa = [("Are these numbers official?", "No. Each preset comes from the firm's own help pages on the date shown, but firms change rules often and the dashboard is the final word. Use these tools to plan, then confirm with your firm."),
          ("Do I need an account?", "No. Everything runs in your browser and nothing you type is sent anywhere."),
          ("Which firms are covered?", "Topstep, Tradeify and MyFundedFutures, where we could read the rules on the firm's own pages. Apex Trader Funding's pages couldn't be read when we checked, so it has no presets yet.")]
    # Floating glass homepage: illustrative numbers are explicitly labeled.
    directory = json.loads((ROOT / "data/directory.json").read_text())
    glass = f"""<section class="glass-hero"><div class="glass-copy"><div class="glass-kicker">FUNDED TRADING INTELLIGENCE</div><h1>Know your rules.<br><span>Plan your payout.</span></h1><p class="lede">Free prop trading calculators for consistency, drawdown, position sizing, evaluation targets and withdrawals. Compare published rules or model your own assumptions.</p><div class="glass-actions"><a class="btn" href="{url('workspace/')}">Open workspace →</a><a class="glass-secondary" href="{url('directory/')}">Explore firm directory</a></div><p class="glass-trust">Browser-based calculations · No account required · Source dates disclosed</p></div><div class="glass-stage" aria-label="Illustrative calculation examples and directory coverage"><div class="float-card float-payout"><small>Illustrative payout · $3,000 × 90%</small><strong>$2,700</strong><span>Before other restrictions or costs</span><svg viewBox="0 0 300 90" aria-hidden="true"><defs><linearGradient id="glassarea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a9a5ff" stop-opacity=".55"/><stop offset="1" stop-color="#a9a5ff" stop-opacity="0"/></linearGradient></defs><path d="M0 78 Q30 65 55 70 T105 45 T155 51 T205 25 T255 30 T300 6 V90 H0Z" fill="url(#glassarea)"/><path d="M0 78 Q30 65 55 70 T105 45 T155 51 T205 25 T255 30 T300 6" fill="none" stroke="#d4c9ff" stroke-width="3"/></svg></div><div class="float-card float-coverage"><small>Research directory</small><strong>{len(directory)}</strong><span>Program entries · {len(OK)} firms with sourced rules</span><div class="glass-dots" aria-hidden="true"><i></i><i></i><i></i></div></div><div class="float-card float-consistency"><small>Example consistency</small><strong>30%</strong><span>$600 best day / $2,000 total</span><div class="glass-meter"><i></i></div></div><div class="float-card float-risk"><small>Example position risk</small><strong>$100</strong><span>2 MES × 10 points × $5</span></div><div class="float-card float-source"><small>Published rule sources</small><strong>{CHK}</strong><span>Check current firm terms before acting.</span></div></div></section>"""
    sections = [
        ("prop-firm-calculator/", "Calculators", "Single-account payout, consistency, drawdown, targets and position size.", "01"),
        ("prop-firm-comparison/", "Compare firms", "Compare published account and payout rules.", "02"),
        ("global-traders/", "Global trackers", "International payout estimates and country restrictions.", "03"),
        ("plan-compare/", "Plan analysis", "Compare consistency requirements against your daily P&L.", "04"),
        ("directory/", "Directory", "Find all "+str(len(directory))+" research entries and their rule coverage.", "05"),
        ("workspace/", "Workspace", "Model multiple accounts, expenses and hypothetical net payouts.", "06"),
    ]
    section_cards = "".join(f'<li><a href="{url(p)}"><span class="section-number">{num}</span><strong>{esc(n)}</strong><small>{esc(d)}</small></a></li>' for p,n,d,num in sections)
    page("", f"PropFirmMath — Funded trading tools",
         desc, f"""{glass}
<section class="glass-section-heading"><div><div class="glass-kicker">EXPLORE THE PLATFORM</div><h2>Six tools. One clear workflow.</h2></div></section>
<ul class="grid-links section-grid">{section_cards}</ul>
<p class="note home-disclosure">Free planning tools. Estimates are not eligibility decisions. Published rules and research status are shown in the relevant firm profiles.</p>""", [{"@context": "https://schema.org", "@type": "WebSite", "name": "PropFirmMath", "url": h["abs_url"]("")}])
    calculator_cards = "".join(f"<li><a href='{url(p)}'>{esc(n)}<small>{esc(d)}</small></a></li>" for p,n,d in TOOLS if p != "prop-firm-comparison/")
    page("prop-firm-calculator/", "Prop firm calculators | PropFirmMath", desc,
         f"""<h1>Calculators</h1><p class="lede">Choose a single-account calculation. Each tool includes its own formula, assumptions and relevant sourced presets.</p><ul class="grid-links tools">{calculator_cards}</ul>{WARN}""",
         crumbs=[("Home",""),("Calculators","prop-firm-calculator/")])

    # ---- calculators
    tool_page("consistency-rule-calculator/", f"Consistency Rule Calculator for Prop Firms ({YEAR})",
              "Free prop firm consistency rule calculator. Paste your daily P&L and see your best-day share, whether you pass, and how much more profit you need.",
              "Consistency rule calculator", "Paste your daily profit and loss and see whether your best day is inside your firm's limit, and if not, how much more you need to make.",
              "consistency", """<h2>How the consistency rule works</h2>
<p>Most futures prop firms cap how much of your profit can come from one day. If the limit is 50% and you've made $2,000, no single day can be more than $1,000. Go over it and you usually don't fail; you just have to keep trading until your total is big enough. That's the <b>more profit</b> number above.</p>
<p>The formula: <b>best day ÷ total profit × 100</b>. You need total profit of at least <b>best day ÷ limit</b>, without having a bigger day on the way.</p>""",
              [("What is a consistency rule?", "A limit on how much of your total profit can come from your single best day, set by the prop firm."),
               ("Do losing days count?", "They lower your total profit, which makes your best day a bigger share of it. They don't shrink your best day."),
               ("Is it the same at every firm?", "No. The percentage, and whether it applies in the evaluation or only for payouts, differs by firm and plan. Pick a firm above to load its number.")],
              "Prop firm consistency rule calculator")
    tool_page("prop-firm-payout-calculator/", f"Prop Firm Payout Calculator ({YEAR}): What You Can Withdraw",
              "Free funded account payout calculator. See how much you can withdraw above the drawdown floor or buffer, the firm's split, and what you actually receive.",
              "Prop firm payout calculator", "See how much of a funded account balance you can request, what the profit split leaves you, and what stays in the account.",
              "payout", """<h2>How a payout is worked out</h2>
<p>Firms let you withdraw profit above a floor: the starting balance, sometimes plus a buffer (often called a safety net). Then they apply limits: a minimum request, a cap per request, sometimes a share of the balance. The split decides how much of the request is yours.</p>""",
              [("What is a payout buffer or safety net?", "An amount above the starting balance that has to stay in the account, so a payout can't leave it right at its failure level."),
               ("What does a 90/10 split mean?", "You keep 90% of each payout and the firm keeps 10%."),
               ("Why is my payout lower than my profit?", "Caps per request, a share-of-balance limit, a buffer and the split each take a piece. Put them all in above to see which one applies.")],
              "Prop firm payout calculator")
    tool_page("trailing-drawdown-calculator/", f"Trailing Drawdown Calculator ({YEAR}): EOD, Intraday & Static",
              "Free trailing drawdown calculator for prop firm accounts. See your failure level and room left for end-of-day, intraday trailing and static drawdown.",
              "Trailing drawdown calculator", "Find where your account fails and how much room you have, for end-of-day trailing, intraday trailing or static drawdown.",
              "drawdown", """<h2>The three kinds of drawdown</h2>
<ul><li><b>End-of-day trailing:</b> the failure level follows your highest closing balance up, never down.</li>
<li><b>Intraday trailing:</b> it follows your highest balance at any moment, open trades included, so a winning trade you give back still moves it.</li>
<li><b>Static:</b> it stays at the starting balance minus the drawdown, however well you do.</li></ul>
<p>Many firms stop the trailing once the level reaches a set point, often the starting balance. Put that in <b>trailing stops at</b>.</p>""",
              [("What happens when trailing drawdown stops?", "The failure level freezes there, so every dollar of profit after that is extra room."),
               ("Which is easier, end-of-day or intraday?", "End-of-day trailing is usually more forgiving, because swings inside a day don't move it."),
               ("Does a daily loss limit count as drawdown?", "No. It's a separate limit on one day's losses. At some firms hitting it only stops you for the day.")],
              "Trailing drawdown calculator")
    tool_page("profit-target-calculator/", f"Prop Firm Profit Target Calculator & Daily Planner ({YEAR})",
              "Plan a prop firm evaluation: profit still needed, the average per day, the biggest day the consistency rule allows and the fewest days it can take.",
              "Profit target planner", "Plan how to reach your evaluation's profit target: what's left, the average per day, and the biggest day you can have without breaking the consistency rule.",
              "target", """<h2>Why the biggest safe day matters</h2>
<p>With a consistency rule, a huge day can make passing harder: the profit you need rises to <b>best day ÷ limit</b>. Keeping each day under the <b>biggest safe day</b> above means you pass as soon as you reach the target.</p>""",
              [("How many days does an evaluation take?", "At least the firm's minimum trading days, and with a consistency rule at least 100 ÷ the limit. A 50% rule means two good days at the very least."),
               ("Should I aim for the average every day?", "It's a plan, not a quota. Trading bigger to hit a number is how accounts fail; use it to see whether your timeline is realistic.")],
              "Prop firm profit target planner")
    tool_page("futures-position-size-calculator/", f"Futures Position Size Calculator ({YEAR}): ES, NQ, MES, MNQ & More",
              "Free futures position size calculator. Enter your stop and the dollars you'll risk and see how many ES, NQ, MES, MNQ, CL or GC contracts to trade.",
              "Futures position size calculator", "Enter your stop and how much you're willing to lose and see how many contracts that is, for minis and micros.",
              "size", """<h2>How it's worked out</h2>
<p>Risk per contract is <b>stop in ticks × tick value</b>. Contracts are your risk divided by that, rounded down. A micro is worth one tenth of the matching mini, which is why micros help in small accounts.</p>
<p class=note>Tick sizes and values are CME Group contract specifications.</p>""",
              [("How much is one point on ES?", "$50 on ES and $5 on MES. On NQ a point is $20 and on MNQ $2."),
               ("Does the firm's contract limit include micros?", "Firms count micros differently; many treat 10 micros as one mini. Check your firm's rule.")],
              "Futures position size calculator")

    # ---- firm pages
    for k in OK:
        f = F[k]
        rows = "".join(
            f"<tr><td>{esc(p.get('label') or m(p['size']))}</td><td>{esc(p['price'])}</td><td class=n>{m(p['target']) if p['target'] else 'None'}</td><td class=n>{m(p['dd'])}</td>"
            f"<td>{esc(p['dd_type'])}</td><td>{esc(p['dll'])}</td><td>{esc(p['contracts'])}</td><td class=n>{p['min_days'] or 'None'}</td>"
            f"<td>{esc(p['consistency'])}</td></tr>" for p in f["plans"])
        srcs = "".join(f"<li><a href='{esc(u)}' rel='nofollow noopener' target=_blank>{esc(t)}</a></li>" for u, t in f["sources"])
        unv = "".join(f"<li>{esc(x)}</li>" for x in f.get("unverified", []))
        lis = lambda xs: "".join(f"<li>{esc(x)}</li>" for x in xs)
        n = f["name"]
        qa = [(f"What is {n}'s consistency rule?", f["rules"][0]),
              (f"How do {n} payouts work?", " ".join(f["payout"][:2])),
              (f"Where do these {n} rules come from?", f"From {n}'s own help pages, read on {CHK}. Rules change, so check them with {n} before you rely on them.")]
        path = f["slug"] + "/"
        page(path, (f"{n} Rules {YEAR}: Profit Target, Drawdown, Consistency & Payouts" if len(n) < 12 else f"{n} Rules {YEAR}: Drawdown, Consistency & Payouts"),
             f"{n} rules for {YEAR} in one place: evaluation prices, profit targets, drawdown, daily loss limits, consistency rule and payout rules, from {n}'s own pages.",
             f"""<h1>{esc(n)} rules, {YEAR}</h1>
<p class=lede>{esc(f['summary'])} Read from {esc(n)}'s own help pages on {CHK}.</p>{WARN}
<h2>{esc(f.get('plans_title', 'Evaluation'))} at a glance</h2>
<div class=table-scroll><table><thead><tr><th>Account</th><th>Price</th><th class=n>Profit target</th><th class=n>Drawdown</th><th>Drawdown type</th><th>Daily loss limit</th><th>Max size</th><th class=n>Min days</th><th>Consistency</th></tr></thead><tbody>{rows}</tbody></table></div>
<h2>Evaluation rules</h2><ul>{lis(f['rules'])}</ul>
<h2>Funded account and payouts</h2><ul>{lis(f['payout'])}</ul>
{aff_btn(k, n)}<h2>Plan your {esc(n)} evaluation</h2>{calc('target', next((i for i, p in enumerate(presets('target')) if p[0].startswith(n.split()[0])), None))}
<h2>Sources</h2><ul>{srcs}</ul>{f'<h2>What we could not confirm</h2><ul>{unv}</ul>' if unv else ''}
{faq_html(qa)}{more_tools()}{SCRIPTS}""", [faq_schema(qa)], crumbs=[("Home", ""), (f"{n} rules", path)])

        # consistency rule page for the firm
        cpre = [i for i, p in enumerate(presets("consistency")) if p[0].startswith(n.split()[0])]
        if cpre and f.get("consistency_page"):
            cp = f["consistency_page"]
            path = f["slug"].replace("-rules", "") + "-consistency-rule/"
            page(path, f"{n} Consistency Rule Explained ({YEAR}) + Calculator",
                 f"How {n}'s consistency rule works in {YEAR}, with a free calculator: paste your daily P&L and see your best-day share and how much more you need.",
                 f"""<h1>{esc(n)} consistency rule</h1><p class=lede>{esc(cp['lede'])}</p>
{calc('consistency', cpre[0], 'Check your days')}{WARN}
<h2>How it works</h2><ul>{lis(cp['points'])}</ul>
<p>Full {esc(n)} rules: <a href='{url(f['slug'] + '/')}'>{esc(n)} rules, {YEAR}</a>.</p>
<h2>Sources</h2><ul>{srcs}</ul>{more_tools()}{SCRIPTS}""",
                 [app_schema(f"{n} consistency rule calculator", path, cp['lede'])],
                 crumbs=[("Home", ""), (f"{n} rules", f['slug'] + '/'), ("Consistency rule", path)])

    # ---- comparison
    from firm_compare import build_firm_compare
    build_firm_compare(page,url,ROOT,DIST,D,CHK,WARN)

    return TOOLS, [(F[k]["slug"] + "/", F[k]["name"] + " rules") for k in OK]
