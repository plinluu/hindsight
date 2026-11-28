import { useEffect, useState } from 'react'
import { publicHeadlines, publicQuotes } from './public-briefing'
import type { Story } from '../feed'

type Price = { symbol: string; change: number; time: number }
type Snapshot<T> = { items: T[]; at: number; provider?: string }
type Brief = { news?: Snapshot<Story>; quotes?: Snapshot<Price> }
const storageKey = 'hindsight.briefing.v3'
const ttl = 600000
const funds: Record<string,string> = { SPY: 'S&P 500', QQQ: 'Nasdaq-100', DIA: 'Dow Jones' }
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
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const current = cached()
    async function refresh() {
      try {
        if (!fresh(current.news) || !fresh(current.quotes)) {
          const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(12000)])
          const hostedApi = location.hostname.endsWith('.github.io') ? null :
            await fetch('/api/finnhub/briefing', { signal }).then(r => r.ok ? r.json() : null).catch(() => null)
          await Promise.allSettled([
            (async () => {
              if (fresh(current.news)) return
              const items = hostedApi?.stories?.length ? hostedApi.stories : await publicHeadlines(signal)
              if (items.length) current.news = { items, at: Date.now() }
            })(),
            (async () => {
              if (fresh(current.quotes)) return
              const hasQuotes = hostedApi?.prices?.length === 3
              const items = hasQuotes ? hostedApi.prices : await publicQuotes(signal)
              current.quotes = { items, at: Date.now(), provider: hasQuotes ? 'Finnhub' : 'TradingView' }
            })(),
          ])
          if (controller.signal.aborted) return
          try { localStorage.setItem(storageKey, JSON.stringify(current)) } catch { /* Storage is optional. */ }
        }
      } catch { /* Keep the last successful update for each card. */ }
      if (!controller.signal.aborted) {
        setLoading(false)
        setData({ ...current })
        const next = Math.min(...[current.news, current.quotes].map(part =>
          fresh(part) ? part!.at + ttl - Date.now() : 60000))
        timer = setTimeout(refresh, Math.max(1000, next))
      }
    }
    void refresh()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [])
  return { ...data, loading }
}
function timestamp(time: number) {
  const date = new Date(time * 1000)
  return <time dateTime={date.toISOString()}>{date.toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'})}</time>
}
function headlineLink(url: string) {
  try {
    const link = new URL(url)
    if (link.protocol === 'https:' || link.protocol === 'http:') return link.href
  } catch { /* Headlines can be displayed without a link. */ }
}
export default function Briefing({ preview = false }: { preview?: boolean }) {
  const { news, quotes, loading } = useBriefing()
  const [category, select] = useState('All')
  const stories = news?.items ?? []
  const prices = quotes?.items ?? []
  const categories = ['All', ...new Set(stories.map(story => story.category))]
  const active = categories.includes(category) ? category : 'All'
  const visible = preview ? stories.filter((story, index) => stories.findIndex(item => item.source === story.source) === index).slice(0, 3) : stories.filter(story => active === 'All' || story.category === active)
  const rising = prices.filter(price => price.change > 0).length
  const falling = prices.filter(price => price.change < 0).length
  const summary = rising === 3 ? 'All three index funds rose' : falling === 3 ? 'All three index funds fell'
    : rising + falling === 0 ? 'All three index funds held steady' : 'The three index funds moved in different directions or held steady'
  return <div className="news-brief">
    <section className="glass">
      <div className="row"><h2>Market recap</h2><small>{quotes ? fresh(quotes) ? quotes.provider : 'Cached quotes' : loading ? 'Loading…' : 'Unavailable'}</small></div>
      <p>{quotes ? summary + ' compared with their previous closing prices.' : loading ? 'Fetching the latest quotes…' : 'Market quotes are temporarily unavailable.'}</p>
      <ul className="fund-moves">{prices.map(p => <li key={p.symbol}><b>{p.symbol}</b> · {funds[p.symbol]} tracker <strong>{p.change > 0 ? '+' : ''}{p.change.toFixed(2)}%</strong>{!preview && <div>{timestamp(p.time)}</div>}</li>)}</ul>
    </section>
    <section className="glass">
      <div className="row"><h2>{preview ? 'Market headlines' : 'Across the news'}</h2><small>{news ? fresh(news) ? [...new Set(stories.map(item => item.source))].join(' · ') : 'Cached headlines' : loading ? 'Loading…' : 'Unavailable'}</small></div>
      {!news && <p>{loading ? 'Fetching headlines…' : 'Headlines are temporarily unavailable.'}</p>}
      {!preview && news && <div className="news-filters" role="group" aria-label="Filter headlines by category">{categories.map(c => <button type="button" key={c} aria-pressed={active === c} onClick={() => select(c)}>{c}</button>)}</div>}
      {visible.map(story => {
        const url = headlineLink(story.url)
        return <article className="news-story" key={story.headline}>
        <div>{story.category} · {story.source} · {timestamp(story.time)}</div>
        <h3>{url ? <a href={url} target="_blank" rel="noreferrer">{story.headline} ↗</a> : story.headline}</h3>
        <p><b>Why it matters</b> · {story.why}</p>
      </article>})}
    </section>
  </div>
}
