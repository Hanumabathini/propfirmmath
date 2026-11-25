# Promo codes and affiliate links: how PropFirmMath gets them and shows them

## How codes come to exist
A prop firm issues a code or tracked link to an approved affiliate partner. When a trader buys through it, the firm pays the partner a commission. So a code can only be listed honestly if (a) the firm approved us as a partner, or (b) the firm published the offer itself.

## How to get them (you do this; it needs a person)
1. Apply to each firm's own affiliate/partner programme (look in the footer or help centre of the firm's site for "Affiliates" or "Partners"). Firms with programmes we have seen referenced: Topstep, Tradeify, MyFundedFutures, Apex, Take Profit Trader, FTMO, FundedNext. Confirm each on the firm's own page before applying; Apex, Take Profit Trader and FTMO pages were not read in this build.
2. Approval gives you a tracked link and sometimes a code. Keep the approval email or dashboard screenshot: it is the proof for `source_url`.
3. Add the entry to `data/deals.json` (below), then run the build. The build rejects an incomplete entry and hides entries older than 45 days since `checked` or past `expires`.
4. Put the tracked link in the firm's environment variable (`TOPSTEP_URL`, `TRADEIFY_URL`, `MFFU_URL`) so firm pages show the button.

## Entry format
```json
{"id":"topstep-1","firm":"Topstep","headline":"10% off the first month","code":"EXAMPLE","url":"https://...tracked link...","source_type":"affiliate-approved","source_url":"https://...proof or the firm's own offer page...","terms":"New accounts only. Confirm the final price at checkout.","checked":"2026-11-25","expires":null}
```
`source_type` is `affiliate-approved` or `firm-published`. Never add a code you cannot prove.

## Rules the site follows
- Every paid link carries a visible "Paid link" label and `rel="sponsored"`. The footer discloses affiliate relationships (FTC endorsement guidance expects a clear disclosure next to the link).
- No invented discounts, no countdown timers, no "limited spots". An expiry is shown only as a date.
- A deal never changes a firm's ranking or description.
- The Deals item appears in the main navigation only when at least one verified deal is live. The page itself always exists and shows an honest empty state.
