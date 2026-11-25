# PropFirmMath — official-source rules and model boundaries
Updated: 25 November 2026. Scope: US futures proprietary trading evaluations and simulated funded accounts.

## The critical distinction
A **calculator result is not firm approval to trade, pass, or withdraw**. An account may satisfy a mathematical best-day ratio and still fail minimum traded days, daily winning days, payout limits, market hours, cumulative payouts, buffer requirements, account status, or purchase-date-specific policy. Show this next to each result.

## Verified official reading
### Topstep
- Trading Combine parameters: https://help.topstep.com/en/articles/8284197-trading-combine-parameters
- Consistency: https://help.topstep.com/en/articles/8284208-consistency-at-topstep — a 55% Combine objective; funded XFA Consistency path uses 40%.
- Payout policy: https://help.topstep.com/en/articles/8284233-topstep-payout-policy
- Express Funded Account: https://help.topstep.com/en/articles/8284215-express-funded-account-parameters
Different funded payout paths are **not interchangeable**; confirm standard vs consistency, winning days, max request, profit split, and eligible product.

### Tradeify
- Consistency rule: https://help.tradeify.co/en/articles/10468320-rules-consistency-rule
- Essential trading rules: https://help.tradeify.co/en/articles/12268167-essential-trading-rules-overview
- Select evaluation: https://help.tradeify.co/en/articles/12853921-select-evaluation-accounts
- Select payout paths: https://help.tradeify.co/en/articles/12853966-select-flex-and-select-daily-payout-policies
- Growth payout policy: https://help.tradeify.co/en/articles/11083796-growth-funded-account-payout-policy
- Lightning payout policy: https://help.tradeify.co/en/articles/10495932-lightning-funded-account-payout-policy
- Lightning account changes: https://help.tradeify.co/en/articles/10495938-lightning-funded-accounts

Key **confirmed variation**: Select Evaluation (40% or 30%, path-dependent), Growth evaluation (no consistency rule) vs Growth funded (35%), Lightning funded first/second/third payout (20%/25%/30% for applicable purchase versions). Select payout caps and Lightning risk parameters changed during 2026. **Purchase date, funded plan and payout sequence must be selected before claiming eligibility.**

### MyFundedFutures
Official firm links and dated per-plan numbers are maintained in `data/prop.json`. Preserve `unverified` entries for conflicting cap, contract, or pricing details. Confirm Rapid / Rapid EOD / Builder / Pro before applying presets.

### Apex
Official rules are not verified in the current dataset. **Do not publish guessed payout thresholds, contract caps or challenge prices.** Offer a neutral firm link only if approved.

## Calculation model and exclusions
- Consistency: maximum profitable day ÷ current total eligible net profit, given the selected percentage. This is a mathematical ratio, not a pass/fail decision by the firm.
- Payout: available amount above the entered floor, payout caps and selected split. Does not establish winning/trading days, previous withdrawals, current account status or payment fees.
- Trailing drawdown: threshold based on user-entered current/peak balances and selected static, EOD or intraday behavior; broker definitions differ, especially intraday unrealized P&L.
- Target planner: arithmetic average needed per day; no guarantee of filling, slippage, liquidity or contract limits.
- Position sizing: exchange tick values for named contracts; excludes transaction fees, slippage, real-time margin, contract limits and gap risk.

## Must-have inputs before future advanced launch
Firm; product; account nominal size; evaluation vs funded; purchase/activation date; payout path; payout number; eligible trading day count; winning days; biggest profit day within eligibility window; net cumulative P&L; prior payouts; balance buffer; trailing threshold; firm-specific drawdown lock; withdrawal fees; max contracts and daily risk limits. Absent a verified rule, render `Not verified` rather than `$0`.

## Quality and commercial policy
- Show official URL and read date beside each firm-specific rule; avoid auto-changing values without manual review.
- Challenge affiliate commissions require approval and valid tracking; never describe a hypothetical commission as earned revenue.
- Avoid pay-to-play performance claims, guaranteed payout language or high-pressure signup CTAs.
- Include responsive 390/768/1440 px tests and independent mathematical boundary cases.
