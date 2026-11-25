# PropFirmMath launch guide

PropFirmMath is a free calculator site for futures traders in prop firm evaluations and funded accounts. It has 5 calculators (consistency rule, payout, trailing drawdown, profit target planner, futures position size), rules pages and consistency rule pages for Topstep, Tradeify and MyFundedFutures, and a comparison table. It is finished and tested. Everything below costs $0.

## Step 1. Put the site online (GitHub Pages, free)

The site is set up for `https://hanumabathini.github.io/propfirmmath/`, so the repository should be named `propfirmmath`. If you pick another name, tell me and I'll change the default.

1. Create an empty public repository named `propfirmmath` on GitHub, with no README, and tell me. I'll push the code.
2. In the repository, open **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Open the **Actions** tab, pick **Deploy site**, and press **Run workflow**.

## Step 2. Affiliate programs (how this site earns)

Each signup is yours to do. Read each program's terms first; most ban paid search ads on the firm's name.

- **Tradeify:** tradeify.co/affiliate-program. 10% to 15% or more on new account purchases, $5 on resets, paid by the 15th of the next month once you pass $1,000.
- **MyFundedFutures:** apply from the MFFU dashboard. Pays on evaluation and reset fees (the rate isn't published), with a $100 monthly minimum.
- **Topstep:** approval only, by email to partners@topstep.com. The rate isn't published.
- **Apex Trader Funding:** has a program, but its pages couldn't be read, so its terms are unknown.

When you have a link, add it as a repository variable (**Settings > Secrets and variables > Actions > Variables**): `TRADEIFY_URL`, `MFFU_URL` or `TOPSTEP_URL`. Then run **Deploy site** again. A "Visit" button with an affiliate disclosure appears on that firm's rules page.

## Step 3. Tell Google and Bing (free)

1. In Google Search Console, add `https://hanumabathini.github.io/propfirmmath/` as a **URL prefix** property and choose the **HTML tag** method.
2. Save only the code inside `content="..."` as a repository variable named `GSC_TOKEN`, run **Deploy site**, then press **Verify**.
3. Submit `sitemap.xml` under **Sitemaps**.
4. In Bing Webmaster Tools, choose **Import from Google Search Console**.

## Optional. Count visitors without cookies (Cloudflare Web Analytics, free)

1. Create a free Cloudflare account, open **Web Analytics**, and add the site `hanumabathini.github.io/propfirmmath` (choose the JavaScript snippet option, no DNS change needed).
2. Copy only the token from the snippet (the value after `"token": `) and save it as a repository variable named `CF_ANALYTICS_TOKEN`, then run **Deploy site**.
3. Visits show up in your Cloudflare dashboard. Without the variable the site loads no analytics at all.

## Keeping it right

Prop firms change rules often. Every rule on the site was read from the firm's own pages on November 25, 2026. Ask me to re-check them about once a month. Apex shows no numbers because its pages refused every automated read.
