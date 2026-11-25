# PropFirmMath

Free calculators for futures traders in prop firm evaluations and funded accounts: consistency rule, payout, trailing drawdown, profit target planner and futures position size, plus Topstep, Tradeify and MyFundedFutures rules pages and a comparison.

- `python3 build.py` builds the static site into `dist/` (needs Python 3 and Node).
- Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).
- `data/prop.json` holds every firm rule and preset, with its source pages and the date read.
- `src/prop.js` is the one calculation engine; `prop_pages.py` builds the pages.
- Setup steps are in `LAUNCH.md`.
