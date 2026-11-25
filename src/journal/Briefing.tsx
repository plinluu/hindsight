import { useEffect, useState } from 'react'
import type { Story } from '../feed'

type Price = { symbol: string; change: number; time: number }
type Snapshot<T> = { items: T[]; at: number }
type Brief = { news?: Snapshot<Story>; quotes?: Snapshot<Price> }
const storageKey = 'hindsight.briefing.v1'
const ttl = 600000
const funds: Record<string,string> = { SPY: 'S&P 500', QQQ: 'Nasdaq-100', DIA: 'Dow Jones' }
const samples = [
  ['Economy', 'Borrowing costs hold steady', 'Interest rates affect the cost of loans for households and businesses.'],
  ['Earnings', 'A retailer reports stronger sales', 'Sales show how much customers spent before the company paid its costs.'],
  ['Deals', 'Two companies agree to merge', 'Combining businesses can change the choices customers have.'],
].map(([category, headline, why], i) => ({
  category, headline, why, url: '', source: 'Hindsight example', time: 1731682800 - i * 3600,
}))
const exampleQuotes = [0.42, 0.76, -0.12].map((change, i) => ({
  symbol: Object.keys(funds)[i], change, time: 1731682800,
}))
function cached(): Brief {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}')
    return {
      news: Array.isArray(value?.news?.items) && value.news.items.length ? value.news : undefined,
      quotes: Array.isArray(value?.quotes?.items) && value.quotes.items.length === 3 ? value.quotes : undefined,
    }
  } catch { return {} }
}
const fresh = (part?: { at: number }) => !!part && Date.now() - part.at < ttl
function useBriefing() {
  const [data, setData] = useState(cached)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let current = cached()
    async function refresh() {
      try {
        if (!fresh(current.news) || !fresh(current.quotes)) {
          const response = await fetch('/api/finnhub/briefing', { signal: controller.signal })
          if (!response.ok) throw Error()
          const { stories, prices } = await response.json()
          const at = Date.now()
          if (stories?.length) current.news = { items: stories, at }
          if (prices?.length === 3) current.quotes = { items: prices, at }
          try { localStorage.setItem(storageKey, JSON.stringify(current)) } catch { /* Storage is optional. */ }
        }
      } catch { /* Keep the last successful update for each card. */ }
      if (!controller.signal.aborted) {
        setData({ ...current })
        const next = Math.min(...[current.news, current.quotes].map(part =>
          fresh(part) ? part!.at + ttl - Date.now() : ttl))
        timer = setTimeout(refresh, Math.max(1000, next))
      }
    }
    void refresh()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [])
  return data
}
function label(part?: { at: number }) {
  return part ? fresh(part) ? 'Finnhub' : 'Cached data' : 'Sample data'
}
function timestamp(time: number) {
  const date = new Date(time * 1000)
  return <time dateTime={date.toISOString()}>{date.toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'})}</time>
}
export default function Briefing({ preview = false }: { preview?: boolean }) {
  const { news, quotes } = useBriefing()
  const [category, select] = useState('All')
  const stories = news?.items ?? samples
  const prices = quotes?.items ?? exampleQuotes
  const categories = ['All', ...new Set(stories.map(story => story.category))]
  const active = categories.includes(category) ? category : 'All'
  const visible = preview ? stories.slice(0, 1) : stories.filter(story => active === 'All' || story.category === active)
  const rising = prices.filter(price => price.change > 0).length
  const falling = prices.filter(price => price.change < 0).length
  const summary = rising === 3 ? 'All three index funds rose' : falling === 3 ? 'All three index funds fell'
    : rising + falling === 0 ? 'All three index funds held steady' : 'The three index funds moved in different directions or held steady'
  return <div className="news-brief">
    <section className="glass">
      <div className="row"><h2>Market recap</h2><small>{label(quotes)}</small></div>
      <p>{summary} compared with their previous closing prices.</p>
      <ul className="fund-moves">{prices.map(p => <li key={p.symbol}><b>{p.symbol}</b> · {funds[p.symbol]} tracker <strong>{p.change > 0 ? '+' : ''}{p.change.toFixed(2)}%</strong>{!preview && <div>{timestamp(p.time)}</div>}</li>)}</ul>
    </section>
    <section className="glass">
      <div className="row"><h2>{preview ? 'Top story' : 'Headlines'}</h2><small>{label(news)}</small></div>
      {!preview && <div className="news-filters" role="group" aria-label="Filter headlines by category">{categories.map(c => <button type="button" key={c} aria-pressed={active === c} onClick={() => select(c)}>{c}</button>)}</div>}
      {visible.map(story => <article className="news-story" key={story.headline}>
        <div>{story.category} · {story.source} · {timestamp(story.time)}</div>
        <h3>{story.url ? <a href={story.url} target="_blank" rel="noreferrer">{story.headline} ↗</a> : story.headline}</h3>
        <p><b>Why it matters</b> · {story.why}</p>
      </article>)}
    </section>
  </div>
}
