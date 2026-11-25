# Competitor teardown — PropFirmMath (25 November 2026)

Benchmarked publicly accessible product pages, not their source code:
- PropTested (https://proptested.com/calculator/consistency): dozens of firms and plan counts, checked-date metadata.
- Prop Firm Consistency (https://propfirmconsistency.com/firms/): side-by-side plan comparison, stage-specific P/L basis, source links and firm-version caveats.
- Tessera Trades (https://www.tesseratrades.com/tools/prop-firm-consistency-calculator): daily P/L breakdown, top-3 concentration and what-if metrics; clearer visuals than a single pass/fail result.
- PipBack (https://pipback.com/consistency-calculator): firm preset selector and paired evaluation/rules pages.
- Myfxbook (https://www.myfxbook.com/forex-calculators/consistency-calculator): simple free arithmetic tool.

## Original improvement shipped
Our `plan-compare/` page evaluates up to three official presets from `data/prop.json` over the same entered days, surfacing the best day, total profit, extra profit required, P/L basis and official source. All presets are **already-source-verified in our dataset**. No third-party firm rule numbers are imported without official confirmation.

## Essential constraints
- Confirm minimum trading/winning days, payout path, account stage, purchase cohort, commission addback, reset windows and post-payout adjustments before announcing true eligibility.
- A manual consistency ratio is **not** evidence of passing a funded challenge.
- Different plans define eligible P/L basis differently (Tradeify before commissions, other plans often after); ask for daily commission input when applicable.
- No fake percentages for competitors' additional firms; sources must be read and rules versioned individually.
- Add ability to import CSV via private browser parsing later; avoid cloud uploads containing account identifiers.
