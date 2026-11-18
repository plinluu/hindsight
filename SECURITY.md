# Security policy

## Supported version

Hindsight is a static site with no server component. Only the latest deployed version at <https://plinluu.github.io/hindsight/> is supported.

## Reporting a vulnerability

Please report security problems **privately** through GitHub's private vulnerability reporting:

<https://github.com/plinluu/hindsight/security/advisories/new>

Do not open a public issue, and do not include a real broker export, API key, or other personal data in a report. A small synthetic file or a description of the shape of the data is enough.

Useful details:

- the affected page or file
- browser and version
- steps to reproduce
- what you expected and what happened
- whether the issue needs a malicious file, a malicious page on the same origin, or a compromised browser

This is a personal project, so there is no formal response SLA. Reports will be acknowledged as soon as practical, and a fix or mitigation will be documented in the repository.

## Security model

### What Hindsight does

- Parses imported CSV/TSV/TXT or pasted text entirely in the browser.
- Keeps imported trades in memory only. They are not written to `localStorage`, `sessionStorage`, IndexedDB, cookies, or a server.
- Stores two kinds of values in `localStorage`, both with the `hs_` prefix:
  - `hs_key`: the visitor's own Alpha Vantage API key, only after they paste one.
  - `hs_s_<TICKER>`: cached weekly price series with a timestamp, expiring after 12 hours.
- Sends exactly one kind of network request: an HTTPS `GET` to `https://www.alphavantage.co/query` with `function=TIME_SERIES_WEEKLY`, the requested symbol, and the visitor's key. Nothing else is sent, and no request is made unless the visitor clicks **Fetch prices**.

### Defences in place

- **Strict CSP meta tag** with `default-src 'none'`, `script-src 'self'`, `style-src 'self'`, `img-src 'self' data:`, `font-src 'self'`, `connect-src https://www.alphavantage.co`, `base-uri 'none'`, and `form-action 'none'`.
- **No inline CSS or JavaScript**, so the policy does not need `'unsafe-inline'`.
- **No third-party requests.** No CDN, analytics, fonts, images, or embeds.
- **`<meta name="referrer" content="no-referrer">`** on the page.
- **DOM output uses `textContent` and DOM construction**, not `innerHTML`, for user-derived values such as tickers and headers.
- **Import hardening.** Plain-text files only; 2 MB and 20,000-row limits; NUL and control-character rejection; clear errors. A rejected file is not parsed or rendered.
- **CSV export hardening.** Cells beginning with `=`, `+`, `-`, or `@` are prefixed with an apostrophe, and cells are quoted and escaped.
- **API-key handling.** The key is entered in a password field, never logged, never added to the page URL or history, and redacted from any Alpha Vantage error text before display. The UI recommends a free key.
- **Data controls.** **Forget my key** removes `hs_key` only. **Delete all my data** removes keys beginning with `hs_`, so other applications on the same `github.io` origin are unaffected.

### Known limitations

- **Meta-tag CSP is weaker than a response header.** It is applied after the HTML parser has seen the meta tag and cannot protect against every injection before that point. The site has no server-side templating and no inline script, which limits the practical exposure. Hosts that can send headers should send the same policy as `Content-Security-Policy`.
- **`localStorage` is not encrypted.** Any JavaScript running on the same origin, or a compromised browser profile or extension, can read it. This is why the app recommends a free, revocable Alpha Vantage key rather than a paid or shared one.
- **GitHub Pages project sites share an origin.** `https://<user>.github.io` is shared by all of that user's project sites. Hindsight scopes its deletion to `hs_*`, but it cannot isolate storage from other projects on the same origin.
- **Alpha Vantage sees the request.** The service receives the visitor's IP address, the requested ticker, and the API key, as with any direct API call. Hindsight cannot change that; the privacy section in the app explains it.
- **Third-party hosting and the browser are out of scope.** Vulnerabilities in GitHub Pages, the visitor's browser, extensions, or Alpha Vantage's service should be reported to those projects.
- **The share card and CSV are generated locally.** Once downloaded, those files are outside Hindsight's control.

## Dependency policy

The project intentionally has no runtime dependencies, no package manager manifest, and no third-party scripts. New dependencies should not be added without a clear security and privacy justification.
