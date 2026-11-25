# PropFirmMath membership build specification
Status: approved requirements; implementation and release gates pending. No live charges authorized.

## Entitlements
Free: 1 active account, basic journal, cloud saving and basic target/consistency tracking.
Pro: 10 active accounts maximum, premium command center, advanced journal, bulk entry, account groups, risk center, payout management, calendar, expenses, analytics, simulator, CSV and reports.
Elite: 25 active accounts maximum, Pro features plus consolidated financial reports, deeper portfolio risk and priority support.
Limits apply across firms; firm restrictions supersede plan capacity. Independent account IDs and versioned rules. Archive records without consuming active slots; downgrades preserve history and restrict editing to selected allowed active accounts. Enforce atomically on server including concurrent requests. Public calculators and directory remain accessible.

## Regional billing
Research country is freely selectable and never authorizes billing discounts. Billing country is independently assigned by server from declared residence, billing address and available verified payment-provider signals. IP country is a risk signal only, not proof of residence; VPN or travel is not automatic grounds for rejection. No GPS requirement. Mismatches require verification or a supported standard-price offer; do not silently change prices. Permanent relocation reviewed. Existing subscriptions retain contracted terms unless lawful disclosed change.
Store immutable country/currency/interval Stripe price mappings on server. Do not accept client-supplied amounts or arbitrary price IDs. Confirm verified billing country and quote before checkout, recheck provider country after checkout, and hold entitlement on unresolved mismatch. Signed idempotent webhooks establish entitlements, reconcile changes and refunds. Verify applicable taxes, supported countries, recurring payment methods and provider terms before offering checkout.
US proposed prices: Pro $14.99 monthly / $119.99 annual; Elite $29.99 / $249.99. Regional monthly candidates (not live offers): CA CAD 19.99/39.99; GB GBP 11.99/23.99; DE,FR EUR 13.99/27.99; AU AUD 22.99/44.99; CH CHF 14.99/29.99; AE AED 49.99/99.99; SA SAR 49.99/99.99; SG SGD 19.99/39.99; JP JPY 1990/3990; KR KRW 14900/29900; IN INR 499/999; PK PKR 1299/2599; BD BDT 599/1199; PH PHP 349/699; ID IDR 89000/179000; MY MYR 29.90/59.90; TH THB 249/499; BR BRL 39.90/79.90; MX MXN 149/299; ZA ZAR 149/299; NG NGN 7500/15000; KE KES 699/1399; TR TRY 299/599. Validate actual costs, local laws, provider support and demand before activation; no invented regional annual prices.

## Architecture and scope
Use existing Vercel project, Supabase Auth/Postgres, RLS and server-only privileged keys; Stripe test mode only until release approval. Email verification, Google login, password recovery, per-user data isolation, export/deletion, durable autosave with conflict recovery. Manual daily P/L and CSV imports; broker and prop-firm synchronization deferred. Premium dark/light responsive workspace, accessible keyboard-friendly spreadsheet, no fake live data. Track net realized cash separately from simulated trading P/L.

## Release gates
Test account limit races, cross-user access, tampered checkout price, VPN/travel/mismatched billing, webhook replay, downgrade preservation, autosave failures, restore backups, browser/mobile accessibility, calculation boundaries and official rule version provenance. Zero known critical/high severity defects before charging. No paid infrastructure upgrades or live billing activation without owner authorization.
Budget planning: Vercel Pro $20/mo, Supabase Pro $25/mo, domain and optional email/monitoring; target $50–85/mo early commercial operation before transaction fees, taxes, professional reviews and labor. Initial reserve $200–300; not a binding quote. Build/test with available free development tiers where permitted.
