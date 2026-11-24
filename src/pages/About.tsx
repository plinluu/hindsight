import { save } from '../data'
export default function About() {
  return (
    <>
      <h1>About Hindsight</h1>
      <section className="panel">
        <h2>How reviews work</h2>
        <p>
          Sales are paired with the oldest available purchase first. Fees are allocated by share. Later prices
          use weekly closes when available. Import one currency at a time. The comparisons exclude dividends,
          taxes and corporate-action adjustments.
        </p>
        <h2>Privacy and terms</h2>
        <p>
          Version 1 · Trade files remain in browser memory. Loading weekly history sends only the selected
          symbol to the proxy and price provider. Charts connect to TradingView. Weather uses Open-Meteo and
          optional city detection. Preferences and public feed caches stay on this device.
        </p>
        <p>
          Use Hindsight for personal education. Verify figures with your broker before making decisions. Past
          outcomes cannot predict future returns.
        </p>
        <button
          onClick={() => {
            Object.keys(localStorage)
              .filter((k) => k.startsWith('hs2:'))
              .forEach((k) => save(k.slice(4), null))
            location.reload()
          }}
        >
          Clear Hindsight data on this device
        </button>
      </section>
    </>
  )
}
