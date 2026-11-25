import { normalizeStories } from '../normalize-stories.mjs'

const feeds = [
  ['CNBC', 'https://www.cnbc.com/id/100003114/device/rss/rss.html'],
  ['MarketWatch', 'https://feeds.content.dowjones.io/public/rss/mw_topstories'],
]

export async function publicHeadlines(signal: AbortSignal) {
  const results = await Promise.allSettled(feeds.map(async ([source, feed]) => {
    const response = await fetch(feed, { signal })
    if (!response.ok) throw Error('Feed unavailable')
    const doc = new DOMParser().parseFromString(await response.text(), 'application/xml')
    return Array.from(doc.querySelectorAll('item')).flatMap(item => {
      const field = (key: string) => item.querySelector(key)?.textContent?.trim() ?? ''
      const datetime = Date.parse(field('pubDate')) / 1000
      if (!Number.isFinite(datetime) || datetime < Date.now() / 1000 - 7 * 86400) return []
      return [{ source, headline: field('title'), url: field('link'), datetime }]
    })
  }))
  return normalizeStories(results.flatMap(result => result.status === 'fulfilled' ? result.value : []))
}

export async function publicQuotes(signal: AbortSignal) {
  const symbols = ['AMEX:SPY', 'NASDAQ:QQQ', 'AMEX:DIA']
  return Promise.all(symbols.map(async ticker => {
    const params = new URLSearchParams({ symbol: ticker, fields: 'change,update_time' })
    const response = await fetch('https://scanner.tradingview.com/symbol?' + params, { signal })
    if (!response.ok) throw Error('Quote unavailable')
    const { change, update_time: time } = await response.json()
    if (!Number.isFinite(change) || !Number.isFinite(time) || time <= 0) throw Error('Invalid quote')
    return { symbol: ticker.split(':')[1], change, time }
  }))
}
