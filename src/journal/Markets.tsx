import {useState, type FormEvent} from 'react'
import companies from './companies.json'
import {SecurityProfile, Overview} from './SecurityData'
import {Chart} from './Today'
import {MarketWidget} from './MarketWidget'

const initial = ['S&P 500 ETF', 'AMEX:SPY']
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const listings = companies.map(row => ({
  row, name:normalize(row[0]), ticker:normalize(row[1].split(':')[1]), alias:normalize(row[2])
}))

function suggestions(query: string) {
  const term = normalize(query)
  if (!term) return []
  const matches = listings.map(entry => {
    const {ticker,name,alias,row} = entry
    const exact = ticker === term || name === term || alias === term || row[1].toLowerCase() === query.toLowerCase()
    const rank = exact ? 0 : name.startsWith(term) || alias.startsWith(term) ? 1 : ticker.startsWith(term) ? 2 : name.includes(term) || alias.includes(term) ? 3 : 4
    return {rank,row}
  }).filter(hit => hit.rank < 4).sort((a,b) => a.rank - b.rank)
  return matches.slice(0,8).map(hit => hit.row)
}

export default function Markets() {
  const [[name,symbol], select] = useState(initial)
  const [query, search] = useState('')
  const [active, highlight] = useState(-1)
  const [expanded, expand] = useState(false)
  const [error, setError] = useState('')
  const results = suggestions(query.trim())
  const visible = expanded && results.length > 0
  function choose(row: string[]) {
    select(row)
    search('')
    expand(false)
    highlight(-1)
    setError('')
  }
  function open(event: FormEvent) {
    event.preventDefault()
    const term = query.trim()
    if (results.length) choose(results[active < 0 ? 0 : active])
    else if (/^(?:[A-Z0-9_]+:)?[A-Z0-9.^/-]{1,20}$/.test(term.toUpperCase()) && (term.includes(':') || term.length <= 5)) choose([term.toUpperCase(),term.toUpperCase()])
    else setError('No matching company. Try a different name or an exchange and ticker.')
  }
  return <>
    <div className="hero"><h1>Markets</h1><p>Find a company and explore its price over time.</p></div>
    <section className="glass market-controls">
      <form onSubmit={open}><label htmlFor="symbol">Find a company or ticker</label>
        <div><input id="symbol" autoComplete="off" role="combobox" aria-autocomplete="list" aria-controls="company-results"
          aria-expanded={visible} aria-activedescendant={visible && active >= 0 ? 'company-'+active : undefined}
          placeholder="Company name or ticker" value={query} required
          onFocus={() => expand(true)} onBlur={() => expand(false)}
          onChange={e => {search(e.target.value);highlight(-1);expand(true);setError('')}}
          onKeyDown={e => {
            if (e.key === 'Escape') {expand(false);highlight(-1)}
            if (results.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
              e.preventDefault()
              expand(true)
              highlight(e.key === 'ArrowDown' ? (active+1)%results.length : (active <= 0 ? results.length-1 : active-1))
            }
          }}/><button>View stock</button></div>
        <ul id="company-results" role="listbox" aria-label="Matching companies" hidden={!visible}>
          {results.map((row,i) => <li key={row[1]+i} id={'company-'+i} role="option" aria-selected={active===i}
            onMouseDown={e => e.preventDefault()} onClick={() => choose(row)}>{row[0]} <span>{row[1]}</span></li>)}
        </ul>
        {expanded && query.trim() && !results.length && <p role="status">No matching companies. You can also enter a ticker.</p>}
      </form>
      {error && <p role="alert">{error}</p>}
      <SecurityProfile key={symbol} symbol={symbol} name={name}/>
      <MarketWidget kind="advanced-chart" symbol={symbol}>{symbol === 'AMEX:SPY' ? <Chart/> : <p>Loading the price chart for {name}…</p>}</MarketWidget>
    </section>
    <Overview/>
  </>
}
