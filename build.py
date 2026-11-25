#!/usr/bin/env python3
"""PropFirmMath static site generator.

Free calculators for traders in prop firm evaluations and funded accounts.
Reads data/prop.json and writes a complete static site to dist/. Needs Python 3 and Node.

Config through environment variables:
  SITE_URL      site origin, no trailing slash (default https://hanumabathini.github.io)
  BASE_PATH     path prefix (default /propfirmmath; set to / on your own domain)
  GSC_TOKEN     Google Search Console verification token (optional)
  CF_ANALYTICS_TOKEN  Cloudflare Web Analytics token: free, cookie-free visitor counts (optional)
  TOPSTEP_URL, TRADEIFY_URL, MFFU_URL   affiliate links, once you have them (optional)
"""
import html, json, os, shutil, datetime, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
DATA = json.loads((ROOT / "data/prop.json").read_text())
SITE_URL = (os.environ.get("SITE_URL") or "https://hanumabathini.github.io").rstrip("/")
BASE = (os.environ.get("BASE_PATH") or "/propfirmmath").rstrip("/")
GSC = os.environ.get("GSC_TOKEN", "")
PREVIEW = os.environ.get("VERCEL_ENV") == "preview" or os.environ.get("PREVIEW") == "1"
CF = os.environ.get("CF_ANALYTICS_TOKEN", "")  # Cloudflare Web Analytics: free, no cookies
AFF = {k: os.environ.get(v, "") for k, v in (("topstep", "TOPSTEP_URL"), ("tradeify", "TRADEIFY_URL"), ("mffu", "MFFU_URL"))}
BRAND = "PropFirmMath"
CHECKED = datetime.date.fromisoformat(DATA["checked"]).strftime("%B %-d, %Y")
esc = html.escape
url = lambda p: f"{BASE}/{p}"
abs_url = lambda p: f"{SITE_URL}{BASE}/{p}"
SITEMAP = []
from site_pages import validate_deals
LIVE_DEALS, _DEAL_PROBLEMS = validate_deals(json.loads((ROOT / "data/deals.json").read_text()))

def page(path, title, desc, body, schema=None, crumbs=None):
    groups = [("Prop firms",[("directory/","Firm directory"),("country-finder/","Country finder"),("prop-firm-comparison/","Compare firms"),("guides/","Trading rules guide")]),("Tools",[("prop-firm-calculator/","All calculators"),("lifetime-cost-calculator/","Lifetime cost"),("plan-compare/","Plan analysis"),("workspace/","Payout scenarios"),("global-traders/","International payout tools")])]
    nav_html = "".join(f'<details class="nav-group"><summary>{esc(label)}</summary><div class="nav-dropdown">'+"".join(f'<a href="{url(p)}"{(" aria-current=page" if path==p else "")}>{esc(n)}</a>' for p,n in items)+'</div></details>' for label,items in groups)
    if LIVE_DEALS:
        deals_current = ' aria-current="page"' if path == "deals/" else ""
        nav_html += f'<a href="{url("deals/")}"{deals_current}>Deals</a>'
    membership_current = ' aria-current="page"' if path == "membership/" else ""
    account_current = ' aria-current="page"' if path == "account/" else ""
    nav_html += f'<a href="{url("membership/")}"{membership_current}>Membership</a><a class="nav-account" href="{url("account/")}"{account_current}>My dashboard</a>'
    home_class = ' class="site-home"' if not path else ""
    hero_preload = f'<link rel="preload" as="image" href="{url("assets/trading-chart.webp")}">' if not path else ""
    canon = abs_url(path)
    blocks = list(schema or [])
    if crumbs:
        blocks.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": abs_url(p)} for i, (n, p) in enumerate(crumbs)]})
    ld = "".join('<script type="application/ld+json">' + json.dumps(b, separators=(",", ":")).replace("</", "<\\/") + "</script>\n" for b in blocks)
    crumb_html = ""
    if crumbs:
        crumb_html = '<nav class="crumbs wrap" aria-label="Breadcrumb">' + " / ".join(
            f'<a href="{url(p)}">{esc(n)}</a>' for n, p in crumbs[:-1]) + f' / <span aria-current="page">{esc(crumbs[-1][0])}</span></nav>'
    gsc = f'<meta name="google-site-verification" content="{esc(GSC)}">' if GSC else ""
    if CF:
        gsc += f"""<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{{"token": "{esc(CF)}"}}'></script>"""
    doc = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{canon}"><meta property="og:site_name" content="{BRAND}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="{url('favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="{url('style.css')}">
<link rel="stylesheet" href="{url('membership.css')}">
<link rel="stylesheet" href="{url('discovery.css')}">
{hero_preload}
{gsc}
{'<meta name="robots" content="noindex,follow">' if PREVIEW else ""}
{ld}</head><body{home_class}>
<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site"><div class="wrap"><a class="logo" href="{url('')}">PropFirm<span>Math</span></a>
<nav class="top" aria-label="Main navigation">{nav_html}</nav></div><div class="wrap region-bar"><label for="site-country">Country of residence</label><select id="site-country"><option value="">Choose your country</option></select><span id="site-region-status" role="status" class="note">Optional for browsing; select for regional tools.</span></div></header><script src="{url('eligibility.js')}"></script><script src="{url('country-policies.js')}"></script><script src="{url('region.js')}"></script>
{crumb_html}
<main class="wrap" id="main-content">
{body}
</main>
<footer class="site"><div class="wrap">
<a class="logo footer-logo" href="{url('')}">PropFirm<span>Math</span></a>
<p>Independent prop firm research, planning calculators, and a trading workspace. Confirm current rules with your firm before paying for an evaluation or requesting a payout.</p>
<nav class="foot-links" aria-label="Footer navigation"><a href="{url('directory/')}">Firm directory</a><a href="{url('country-finder/')}">Country finder</a><a href="{url('guides/')}">Trading rules guide</a><a href="{url('deals/')}">Deals &amp; disclosure</a><a href="{url('site-map/')}">Site map</a><a href="{url('about/')}">About</a><a href="{url('privacy/')}">Privacy</a></nav>
<p class="note">{BRAND} isn't affiliated with any prop firm. Some links may be affiliate links: if you buy through them we may earn a commission at no cost to you.</p>
</div></footer>
<noscript><div class="wrap warn">Enable JavaScript to choose your country and use calculators.</div></noscript><script defer src="{url('motion.js')}"></script>
</body></html>"""
    out = DIST / path / "index.html" if path else DIST / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc)
    SITEMAP.append(canon)

def faq_html(qa):
    return "<h2>Questions traders ask</h2>" + "".join(
        f"<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in qa)

def faq_schema(qa):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qa]}

def app_schema(name, path, desc):
    return {"@context": "https://schema.org", "@type": "WebApplication", "name": name, "url": abs_url(path),
            "applicationCategory": "FinanceApplication", "operatingSystem": "Any", "description": desc,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}

def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    shutil.copy(ROOT / "src/style.css", DIST / "style.css")
    shutil.copy(ROOT / "src/discovery.css", DIST / "discovery.css")
    shutil.copytree(ROOT / "src/assets", DIST / "assets")
    shutil.copy(ROOT / "src/motion.js", DIST / "motion.js")
    shutil.copy(ROOT / "src/home-finder.js", DIST / "home-finder.js")
    shutil.copy(ROOT / "src/region.js", DIST / "region.js")
    shutil.copy(ROOT / "src/eligibility.js", DIST / "eligibility.js")
    (DIST / "country-policies.js").write_text("window.PFM_POLICIES=" + json.dumps({"firms": json.loads((ROOT / "data/country-policies.json").read_text())["firms"]}, separators=(",", ":")) + ";")
    (DIST / "favicon.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2457c5"/><text x="16" y="22" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">%</text></svg>')
    from prop_pages import build_prop
    build_prop({"page": page, "esc": esc, "url": url, "abs_url": abs_url, "ROOT": ROOT, "DIST": DIST, "aff": AFF,
                "faq_html": faq_html, "faq_schema": faq_schema, "app_schema": app_schema})

    page("about/", f"About {BRAND}", f"{BRAND} is a free set of prop firm calculators for funded futures traders. Here is where the rules come from and how the math works.",
         f"""<h1>About {BRAND}</h1><p>{BRAND} is a free set of calculators for futures traders in prop firm evaluations and funded accounts: consistency rules, payouts, trailing drawdown, profit targets and position size.</p>
<p>Every firm rule comes from the firm's own help or plan pages, and each page says where it came from and when it was read. Where a firm's pages couldn't be read, we show no numbers for it. The math runs in your browser; nothing you type is sent anywhere.</p>
<p>{BRAND} isn't affiliated with any prop firm, and nothing here is trading or financial advice.</p>""", crumbs=[("Home", ""), ("About", "about/")])
    page("privacy/", f"Privacy policy | {BRAND}", f"How {BRAND} handles your data: the calculators run in your browser, local demo records stay in your browser, and some links may be affiliate links.",
         f"""<h1>Privacy policy</h1><p>Last updated {CHECKED}.</p>
<p>The calculators run entirely in your browser. The numbers you enter aren't sent to us or stored on a server.</p>
<p>The account demonstration stores trading records and the selected demo tier in local browser storage. The country selector and plan-analysis journal use session storage. Clear site data to remove all local records, or use Reset demo data to clear the account demo only. Anyone sharing your browser profile may access these records. Do not enter real financial or personal data.</p>
<p>We may use Cloudflare Web Analytics, which counts page views without cookies and without tracking you across sites. If we ever add advertising or other cookies, this page will be updated first.</p>
<p>Some links may be affiliate links. If you buy through them we may earn a commission; the firm may set its own cookie to record the referral.</p>""",
         crumbs=[("Home", ""), ("Privacy", "privacy/")])
    nf = (DIST / "about/index.html").read_text().replace(
        f"<h1>About {BRAND}</h1>", f"<h1>Page not found</h1><p><a href='{url('')}'>Go to the calculators</a></p><h2>About {BRAND}</h2>", 1)
    nf = re.sub(r"<title>.*?</title>", f"<title>Page not found | {BRAND}</title>", nf, count=1)
    nf = re.sub(r'<link rel="canonical"[^>]*>', '<meta name="robots" content="noindex">', nf, count=1)
    (DIST / "404.html").write_text(nf)

    guide_sections = [
        ("Check where you can apply", "Start with the firm's rules for your country. Read the official restrictions and confirm any rules tied to the program or identity checks.", "country-finder/", "Check your country"),
        ("Compare the fees you may pay", "List the evaluation fee, renewals, activation, resets, and platform or data fees. Use the firm's checkout to verify current prices and separate one-time fees from recurring costs.", "lifetime-cost-calculator/", "Estimate lifetime cost"),
        ("Identify the drawdown rule", "Check what balance or equity the firm measures, when the threshold updates, and whether it stops moving at a specified level. Use the rule for the exact plan and stage.", "trailing-drawdown-calculator/", "Model your drawdown"),
        ("Check how the firm counts consistency", "Confirm the stage, profit basis and measurement window. A best-day percentage is one calculation in a rule set that may also include minimum trading or winning days.", "consistency-rule-calculator/", "Check your best day"),
        ("Review payout and withdrawal conditions", "Check the minimum, retained profit, request cap and trader share. Track trading profit and the cash you receive separately so you can account for costs and currency conversion.", "prop-firm-payout-calculator/", "Estimate a payout"),
    ]
    guide_cards = "".join(
        f'<section class="guide-chapter"><h2>{title}</h2><div><p>{summary}</p><a href="{url(path)}">{action}</a></div></section>'
        for title, summary, path, action in guide_sections
    )
    page("guides/", "Trading rules guide | PropFirmMath", "A practical checklist for researching prop firm eligibility, fees, drawdown, consistency, and payout rules.",
         f"""<section class="experience-hero"><h1>Trading rules guide</h1><p class="lede">Five checks to make before you choose a funded trading program.</p><a class="btn" href="{url('prop-firm-comparison/')}">Compare published plans</a></section>
<div class="guide-chapters">{guide_cards}</div>""",
         crumbs=[("Home", ""), ("Trading rules guide", "guides/")])

    from plan_comparison import build_plan_comparison
    build_plan_comparison(page, url, ROOT, DIST, CHECKED)
    from global_traders import build_global_traders
    build_global_traders(page, url, ROOT, DIST, CHECKED)

    from expanded import build_expanded
    build_expanded(page, url, ROOT, DIST, CHECKED)

    from membership import build_membership
    build_membership(page, url, ROOT, DIST)
    from site_pages import build_site_pages
    print("Country finder and deals:", build_site_pages({}, page, url, ROOT, DIST, CHECKED))

    links = []
    for canon in sorted(set(SITEMAP)):
        relative = canon.removeprefix(SITE_URL + BASE + "/")
        label = "Home" if not relative else relative.strip("/").replace("/", " / ").replace("-", " ").title()
        links.append(f'<li><a href="{url(relative)}">{esc(label)}</a></li>')
    page("site-map/", "PropFirmMath site map", "Find all firm profiles, calculators and guides.", "<h1>Site map</h1><ul class=grid-links>" + "".join(links) + "</ul>")
    today = datetime.date.today().isoformat()
    (DIST / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "".join(f"<url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n" for u in SITEMAP) + "</urlset>\n")
    (DIST / "robots.txt").write_text(("User-agent: *\nDisallow: /\n" if PREVIEW else f"User-agent: *\nAllow: /\n\nSitemap: {abs_url('sitemap.xml')}\n"))
    print(f"Built {len(SITEMAP)} pages into {DIST}")

if __name__ == "__main__":
    build()
