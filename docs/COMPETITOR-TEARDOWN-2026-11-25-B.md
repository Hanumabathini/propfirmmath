# Competitor teardown: a large prop firm comparison site (read 2026-11-25)

Our own summary of what one large comparison site does, and what PropFirmMath took from it. Nothing was copied: no text, images, logos, code or branding.

## How their site is built
- Homepage stacks many sections: hero with two calls to action and a quiz, rotating deals, a live payout feed, a logo strip, a market switcher, a ranked table, a savings calculator, a short matcher, "best for" guide chips, a free-account pitch, tools, a trust block, blog cards, a long FAQ and a large footer.
- Firm pages: key stats up top, then tabs for overview, plans, offers, rules, payouts, contract limits and reviews, then "is it legit", firm-vs-firm paragraphs and a long FAQ.
- Many search pages are generated from data: "best for" a trait, a country, or a feature, and firm-vs-firm pages.
- Money comes from affiliate links and discount codes on almost every block, plus loyalty points for account sign-ups.

## What we built from it (our words, our design, sourced data only)
1. Plan finder: seven questions about how you trade, scored against each sourced plan's published rules, with reasons and things to watch. Answers live in the page address so results can be shared.
2. Plans by rule: generated pages for rules traders search for. A group needs two sourced plans before it becomes a page.
3. Firm vs firm pages for each pair of sourced firms, with differences worked out from the data.
4. Glossary of prop firm terms with DefinedTermSet schema and no firm numbers.
5. Homepage plan finder teaser and a "how we work" trust strip.
6. Deals slot driven by data/deals.json. It is empty and renders nothing until real, sourced offers exist.

## What we left out, and why
- Live payout feed, ratings and user reviews: we have no data we can source.
- Discount codes: we have none, and we don't invent them.
- Loyalty points and giveaways: not part of the membership plan.
- Dozens of unsourced firms with numbers: we only show numbers we read on the firm's own pages.
