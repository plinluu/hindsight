import {useState, type FormEvent} from 'react'
import {save, useValue} from '../data'
import {defaults} from '../Charts'
import {Chart, Overview} from './Today'
import {MarketWidget} from './MarketWidget'

const valid = /^(?:[A-Z0-9_]+:)?[A-Z0-9.^/-]{1,20}$/
const names: Record<string,string> = {'AMEX:SPY':'S&P 500 ETF', 'NASDAQ:QQQ':'Nasdaq 100 ETF', 'NASDAQ:AAPL':'Apple', 'NASDAQ:MSFT':'Microsoft'}
function watchlist(raw: string | null): string[] {
  try {
    const list: unknown = JSON.parse(raw ?? 'null')
    if (Array.isArray(list)) return [...new Set(list.filter((s): s is string => typeof s === 'string' && valid.test(s)))]
  } catch { /* Use starter symbols when stored data is damaged. */ }
  return defaults.slice(0, 2)
}

export default function Markets() {
  const [symbol, select] = useState('AMEX:SPY')
  const [query, search] = useState('')
  const [error, setError] = useState('')
  const saved = watchlist(useValue('watchlist'))
  function open(event: FormEvent) {
    event.preventDefault()
    const term = query.trim().toUpperCase()
    const match = [...defaults, ...saved].find(s => s.split(':').pop() === term || names[s]?.toUpperCase() === term)
    if (!match && !valid.test(term)) { setError('Enter a ticker such as SPY or NASDAQ:MSFT.'); return }
    select(match ?? term)
    search('')
    setError('')
  }
  const included = saved.includes(symbol)
  return <>
    <div className="hero"><h1>Markets</h1><p>Follow a symbol and compare its price over time.</p></div>
    <section className="glass market-controls">
      <div className="row"><h2>{names[symbol] || symbol}</h2><button onClick={() => save('watchlist', JSON.stringify(included ? saved.filter(s => s !== symbol) : [...saved,symbol]))}>{included ? 'Remove from watchlist' : 'Add to watchlist'}</button></div>
      <form onSubmit={open}><label htmlFor="symbol">Find a symbol</label><div><input id="symbol" value={query} onChange={e => search(e.target.value)} list="market-symbols" placeholder="Ticker or company" required/><datalist id="market-symbols">{[...new Set([...defaults,...saved])].map(s => <option key={s} value={s}>{names[s] || s}</option>)}</datalist><button>Open chart</button></div></form>
      {error && <p role="alert">{error}</p>}
      <MarketWidget kind="advanced-chart" symbol={symbol}><Chart/></MarketWidget>
    </section>
    <section className="glass market-controls"><h2>Watchlist</h2><div className="watchlist">{saved.map(s => <button key={s} aria-pressed={symbol === s} onClick={() => {select(s);setError('')}}>{s}</button>)}{!saved.length && <p>Add a symbol above to follow it here.</p>}</div></section>
    <Overview/>
  </>
}
