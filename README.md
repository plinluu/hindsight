# Hindsight
Use Node 22 or newer. From this directory run `npm ci`, copy `.env.example` to `.env`, then run `npm run dev`. Open the local URL printed by Vite.
Run `npm test`, `npm run lint` and `npm run build` for verification. `npm run preview` serves the production bundle with the local API handlers.
## Hosting
Vercel can serve the Vite build in `dist` and the two functions in `api` on the same origin. Configure the environment in the host's secret settings. For another static host, serve the build and route sibling `api/market` and `api/history` requests to equivalent Node functions. Hash routes support subdirectory hosting.
## Providers
Set FINNHUB_API_KEY for news, stock quotes and index/sector ETF comparisons. Set ALPHAVANTAGE_KEY for user-requested weekly history. OPENAI_API_KEY optionally enables written recaps with OPENAI_MODEL. Keep all keys server-side. Restart the dev server after changing .env.
Weather, city search and TradingView use public services. Chart and quote availability depend on symbol coverage and provider access.
## Artwork
Replace the twelve gradient WebPs in `public/assets/bg` using `docs/IMAGE_PROMPTS.md`. Export 2560×1440 originals and 768×432 mobile versions with the existing -small suffix.

