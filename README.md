# PropFirmMath

Live site: https://hanumabathini.github.io/propfirmmath/

Compare prop firms by the math, not the marketing. The site is a Spatial UI & Glassmorphism multi-page site: a 47-firm directory (20 reviewed in full), deals and discount codes, a payout tracker, firm comparisons, calculators, guides, and a find-your-firm quiz. Firm data is a snapshot dated Nov 25, 2026.

- The whole site is one self-contained file: `site/index.html`. It uses hash routes (`#/firms`, `#/quiz`, `#/compare`, …) and needs no build step. Notes on the pages are in `site/README.md`.
- Pushing to `main` deploys it to GitHub Pages (`.github/workflows/deploy.yml` uploads `site/`).
- `.github/workflows/quality.yml` checks that `site/index.html` exists and contains the title, firm data, and main routes.
- `docs/` holds the research notes behind the directory (competitor review and verified rule methodology).
