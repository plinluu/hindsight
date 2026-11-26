# Hindsight 3.2

Hindsight is a browser-based market journal for reviewing completed trades. Import a broker export, see how purchases and sales pair up, and explore what prices did after each sale. The Today page brings together charts, market headlines, and optional weather-based seasonal scenery.

[Open Hindsight](https://plinluu.github.io/hindsight/) · [Download the built website](https://github.com/plinluu/hindsight/releases/download/v3.2.0/hindsight-v3.2.0-web.zip)

## Screenshots

| Today · desktop | Trade Review · desktop |
| --- | --- |
| ![Winter Today page with the evening greeting and market chart](docs/screenshots/v3.2-today.png) | ![Trade Review with a simulated sale](docs/screenshots/v3.2-review.png) |

<details><summary>Learn on mobile</summary>

<img src="docs/screenshots/v3.2-learn.png" alt="Mobile lesson selector and illustrative price chart" width="320">

</details>

## Privacy and security

Broker files are parsed in the browser. Opening a TradingView chart sends the selected symbol to TradingView. Optional weather and city search send coordinates or a city query to Open-Meteo. Automatic location lookup can use ipapi.co. Preferences and cached public data are stored on the device.

The static release contains no server-side API handlers. It uses public data where available and labels cached or sample results. On a server deployment, keep provider keys in the server environment. Report suspected vulnerabilities privately and omit credentials, trading records, and personal information. [Security reporting](SECURITY.md)

## Running the download

Extract the release ZIP. From the directory **containing** the extracted `hindsight` folder, run `python3 -m http.server 8000 --bind 127.0.0.1` and open [the local journal](http://127.0.0.1:8000/hindsight/). The download contains the compiled site and uses the same URL layout as GitHub Pages.

## Working from source

Use Node.js 22 or later. Run `npm ci` and `npm run dev`. Run `npm test` and `npm run lint` to check changes. For the GitHub Pages build, run `npm run build -- --base=/hindsight/`. Vite writes the static files to `dist/`. For a deployment with server-side market APIs, see the handlers in `api/` and the example environment settings in `.env.example`.

## Terms and reuse

Hindsight is for personal education. Verify trade calculations against your broker’s records. Prices, illustrative examples, and historical comparisons are not investment advice.

© 2026 plinluu. The license covers Hindsight’s original code, branding, and artwork. Third-party components and data retain their own terms. The reuse notice addresses copying, redistribution, and AI training. [License](LICENSE) · [Copyright and reuse](COPYRIGHT.txt)
