import copyrightNotice from '../../COPYRIGHT.txt?raw'
import { save } from '../data'
export default function About() {
  return (
    <>
      <h1>About Hindsight</h1>
      <section className="glass about-panel">
        <h2>How reviews work</h2>
        <p>
          Sales are paired with the oldest available purchase first. Fees are allocated by share. Later comparisons use a TradingView quote or a closing price you enter. Import one currency at a time. The comparisons exclude dividends,
          taxes and corporate-action adjustments.
        </p>
        <h2>Privacy and terms</h2>
        <p>
          Trade files are processed in your browser. Opening a market chart sends the selected symbol to TradingView.
          Weather and city search send your selected location or search query to Open-Meteo. If you use automatic city
          detection, ipapi.co receives your IP address. Hindsight saves preferences and public feed caches in your
          browser. The hosting and data providers handle requests under their own privacy terms.
        </p>
        <p>
          Hindsight is provided as is for personal education and offers no investment advice. Verify figures with your broker before making decisions. Past
          outcomes cannot predict future returns.
        </p>
        <h2>Copyright and reuse</h2>
        {copyrightNotice.trim().split(/\n\s*\n/).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <p><a href="https://github.com/plinluu/hindsight/blob/hindsight-v3.2/LICENSE">License and permitted use</a> · <a href="https://github.com/plinluu/hindsight/blob/hindsight-v3.2/SECURITY.md">Report a security issue</a></p>
        <button className="glass-inset"
          onClick={() => {
            Object.keys(localStorage)
              .filter((k) => k.startsWith('hs2:'))
              .forEach((k) => save(k.slice(4), null))
            localStorage.removeItem('hindsight.briefing.v2')
            save('hindsight.winterLatch', null)
            location.reload()
          }}
        >
          Clear Hindsight data on this device
        </button>
      </section>
    </>
  )
}
