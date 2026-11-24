# Old Hindsight inventory
Paths are relative to the old Hindsight folder. Each decision applies to the user-facing behavior.
- Rewrite cleaner — Home greeting, seasonal scene and time context. index.html, season.js
- Rewrite cleaner — Market snapshot, daily recap and symbol chart with ticker detail. index.html, app.js, data/market.json
- Keep — Broker export links, example trades and a demo path before import. index.html, app.js
- Keep — Local file/paste import, delimiter detection, column mapping, validation and size limits. app.js, core.js
- Keep — FIFO matching with partial lots, fees and unmatched sales. core.js
- Rewrite cleaner — Optional historical price lookup and cache. Move provider credentials behind a proxy. app.js
- Keep — Per-sale chart with entry, exit and subsequent price at three review horizons. app.js, core.js
- Keep — After-fee results, cumulative return, winning share, average hold and missed-upside ranking. app.js, core.js
- Keep — Fee breakdown and three descriptive habit checks. app.js, core.js
- Keep — Downloadable all-trade PNG with optional ticker and amount masking. app.js
- Keep — CSV download with spreadsheet formula protection. app.js, core.js
- Keep — Seven illustrated lessons on why prices move, using simulated examples. index.html, app.js
- Rewrite cleaner — Dated, sourced headlines and daily refresh pipeline with stale/sample handling. app.js, scripts/, data/news.json
- Keep — About, methodology, privacy, risk, terms acceptance, decline route and local data deletion. index.html, app.js
- Rewrite cleaner — Keyboard routing, document titles and focus restoration. app.js
- Drop — Unconnected waitlist and empty social destinations. Retain configured contact and repository links. index.html, app.js
