import { useEffect, useState } from 'react'
import { chartTools, defaults, Widget } from '../Charts'
import { useValue, save } from '../data'
export default function Markets() {
  const [symbol, select] = useState(defaults[0]),
    [q, query] = useState(''),
    [error, msg] = useState(''),
    [tool, open] = useState(''),
    [theme, setTheme] = useState('light'),
    [tint, setTint] = useState('#fff9ef')
  const value = useValue('watchlist'),
    list: string[] = value ? JSON.parse(value) : defaults.slice(0, 2)
  useEffect(() => {
    const sync = () => {setTheme(document.documentElement.dataset.sun === 'night' ? 'dark' : 'light');setTint(getComputedStyle(document.documentElement).getPropertyValue('--chart-tint').trim() || '#fff9ef')}
    sync()
    const ob = new MutationObserver(sync)
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sun','data-season'] })
    return () => ob.disconnect()
  }, [])
  const params = new URLSearchParams({
    symbol,
    interval: 'D',
    theme,
    style: '1',
    timezone: 'Etc/UTC',
    locale: 'en',
    allow_symbol_change: '1',
    toolbar_bg: tint,
  })
  return (
    <>
      <h1>Markets</h1>
      <section className="panel stack">
        <div className="row">
          <h2>{symbol.split(':').pop()}</h2>
          <button
            onClick={() =>
              save(
                'watchlist',
                JSON.stringify(list.includes(symbol) ? list.filter((s) => s !== symbol) : [...list, symbol]),
              )
            }
          >
            {list.includes(symbol) ? 'Remove from watchlist' : 'Save to watchlist'}
          </button>
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            const s = q.trim().toUpperCase()
            if (!/^(?:[A-Z0-9_]+:)?[A-Z0-9.^/-]{1,20}$/.test(s)) {
              msg('Enter a ticker such as MSFT or NASDAQ:MSFT.')
              return
            }
            select(s)
            msg('')
            query('')
          }}
        >
          <label>
            Find a symbol
            <input
              value={q}
              list="symbols"
              onChange={(e) => query(e.target.value)}
              placeholder="e.g. NASDAQ:MSFT"
              required
            />
          </label>
          <datalist id="symbols">
            {defaults.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </datalist>
          <button>Open chart</button>
        </form>
        <p role="status">{error}</p>
        <iframe
          title="Interactive price chart"
          src={'https://s.tradingview.com/widgetembed/?' + params}
          style={{ width: '100%', height: 'clamp(360px,52vh,620px)' }}
        />
        <a href={'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(symbol)}>
          Open chart on TradingView
        </a>
      </section>
      <section className="panel">
        <h2>Watchlist</h2>
        <div className="row">
          {list.length ? (
            list.map((s) => (
              <button key={s} onClick={() => select(s)}>
                {s}
              </button>
            ))
          ) : (
            <p>Search for a symbol to start your watchlist.</p>
          )}
        </div>
      </section>
      <h2>Explore markets</h2>
      {Object.entries(chartTools).map(([label, kind]) => (
        <details
          key={kind}
          open={tool === kind}
          onToggle={(e) => {
            if (e.currentTarget.open) open(kind)
            else open((t) => (t === kind ? '' : t))
          }}
        >
          <summary>{label}</summary>
          {tool === kind && <Widget kind={kind} symbol={symbol} theme={theme} />}
        </details>
      ))}
      <a href="#/News">Market news</a>
    </>
  )
}
