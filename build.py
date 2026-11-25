#!/usr/bin/env python3
"""PropFirmMath static site generator.

Free calculators for futures traders in prop firm evaluations and funded accounts.
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

def page(path, title, desc, body, schema=None, crumbs=None):
    canon = abs_url(path)
    blocks = list(schema or [])
    if crumbs:
        blocks.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": abs_url(p)} for i, (n, p) in enumerate(crumbs)]})
    ld = "".join('<script type="application/ld+json">' + json.dumps(b, separators=(",", ":")).replace("</", "<\\/") + "</script>\n" for b in blocks)
    crumb_html = ""
    if crumbs:
        crumb_html = '<div class="crumbs wrap">' + " / ".join(
            f'<a href="{url(p)}">{esc(n)}</a>' for n, p in crumbs[:-1]) + f" / {esc(crumbs[-1][0])}</div>"
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
{gsc}
{'<meta name="robots" content="noindex,follow">' if PREVIEW else ""}
{ld}</head><body>
<header class="site"><div class="wrap"><a class="logo" href="{url('')}">PropFirm<span>Math</span></a>
<nav class="top" aria-label="Main navigation"><a href="{url('')}">Home</a><a href="{url('directory/')}">Prop firms</a><a href="{url('')}#calculators">Calculators</a><a href="{url('prop-firm-comparison/')}">Compare</a><a href="{url('workspace/')}">Workspace</a></nav></div></header>
{crumb_html}
<main class="wrap" id="main-content">
{body}
</main>
<footer class="site"><div class="wrap">
<p><b>{BRAND}</b> is a free set of calculators for futures traders in prop firm evaluations and funded accounts. Firm rules read {CHECKED} from each firm's own pages. Every result is an estimate: your firm's dashboard is the final word. Nothing here is trading or financial advice.</p>
<p><a href="{url('global-traders/')}">International payouts</a> · <a href="{url('plan-compare/')}">Consistency comparison</a> · <a href="{url('directory/')}">Firm directory</a> · <a href="{url('workspace/')}">Workspace</a> · <a href="{url('site-map/')}">Site map</a> · <a href="{url('about/')}">About</a> · <a href="{url('privacy/')}">Privacy</a> · <a href="{url('prop-firm-comparison/')}">Rule sources</a></p>
<p class="note">{BRAND} isn't affiliated with any prop firm. Some links may be affiliate links: if you buy through them we may earn a commission at no cost to you.</p>
</div></footer>
<script defer src="{url('motion.js')}"></script>
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
    shutil.copy(ROOT / "src/motion.js", DIST / "motion.js")
    (DIST / "favicon.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2457c5"/><text x="16" y="22" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">%</text></svg>')
    from prop_pages import build_prop
    build_prop({"page": page, "esc": esc, "url": url, "abs_url": abs_url, "ROOT": ROOT, "DIST": DIST, "aff": AFF,
                "faq_html": faq_html, "faq_schema": faq_schema, "app_schema": app_schema})

    page("about/", f"About {BRAND}", f"{BRAND} is a free set of prop firm calculators for funded futures traders. Here is where the rules come from and how the math works.",
         f"""<h1>About {BRAND}</h1><p>{BRAND} is a free set of calculators for futures traders in prop firm evaluations and funded accounts: consistency rules, payouts, trailing drawdown, profit targets and position size.</p>
<p>Every firm rule comes from the firm's own help or plan pages, and each page says where it came from and when it was read. Where a firm's pages couldn't be read, we show no numbers for it. The math runs in your browser; nothing you type is sent anywhere.</p>
<p>{BRAND} isn't affiliated with any prop firm, and nothing here is trading or financial advice.</p>""", crumbs=[("Home", ""), ("About", "about/")])
    page("privacy/", f"Privacy policy | {BRAND}", f"How {BRAND} handles your data: the calculators run in your browser, nothing you type is stored, and some links may be affiliate links.",
         f"""<h1>Privacy policy</h1><p>Last updated {CHECKED}.</p>
<p>The calculators run entirely in your browser. The numbers you enter aren't sent to us or stored on a server.</p>
<p>We may use Cloudflare Web Analytics, which counts page views without cookies and without tracking you across sites. If we ever add advertising or other cookies, this page will be updated first.</p>
<p>Some links may be affiliate links. If you buy through them we may earn a commission; the firm may set its own cookie to record the referral.</p>""",
         crumbs=[("Home", ""), ("Privacy", "privacy/")])
    nf = (DIST / "about/index.html").read_text().replace(
        f"<h1>About {BRAND}</h1>", f"<h1>Page not found</h1><p><a href='{url('')}'>Go to the calculators</a></p><h2>About {BRAND}</h2>", 1)
    nf = re.sub(r"<title>.*?</title>", f"<title>Page not found | {BRAND}</title>", nf, count=1)
    nf = re.sub(r'<link rel="canonical"[^>]*>', '<meta name="robots" content="noindex">', nf, count=1)
    (DIST / "404.html").write_text(nf)

    from plan_comparison import build_plan_comparison
    build_plan_comparison(page, url, ROOT, DIST, CHECKED)
    from global_traders import build_global_traders
    build_global_traders(page, url, ROOT, DIST, CHECKED)

    from expanded import build_expanded
    build_expanded(page, url, ROOT, DIST, CHECKED)

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
