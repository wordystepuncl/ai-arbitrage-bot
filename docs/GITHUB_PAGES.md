# GitHub Pages setup

[View the PARALLAX demo](https://wordystepuncl.github.io/arbitrage/) · [Download source ZIP](https://wordystepuncl.github.io/arbitrage/downloads/parallax-ai-arbitrage-bot.zip)

The shared [site repository](https://github.com/wordystepuncl/wordystepuncl.github.io) hosts the prebuilt app in `arbitrage/`. Pages publishes that repository's `main` branch from `/(root)`.

## Update the live demo

1. Run `npm run build` with Node.js 22 or later.
2. Copy the generated `DEMO.html` to `arbitrage/index.html` in the site repository.
3. Copy `dist/client/downloads/parallax-ai-arbitrage-bot.zip` to `arbitrage/downloads/parallax-ai-arbitrage-bot.zip` in the site repository.
4. Commit both files to `main`. The README links keep the same URLs.

Public quote requests go directly from the browser to the exchanges. Regional API restrictions, rate limits and CORS policies can affect availability.
