import { normalizeStories } from '../src/normalize-stories.mjs'
export { normalizeStories }
const baskets = [
  ['SPY', 'S&P 500 tracker', 'Index'],
  ['QQQ', 'Nasdaq-100 tracker', 'Index'],
  ['DIA', 'Dow tracker', 'Index'],
  ['XLK', 'Technology', 'Sector'],
  ['XLF', 'Financials', 'Sector'],
  ['XLE', 'Energy', 'Sector'],
  ...['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'].map((s) => [s, s, 'Stock']),
]
export async function fromFinnhub(path, key) {
  const r = await fetch('https://finnhub.io/api/v1/' + path, {
    headers: { 'X-Finnhub-Token': key },
    signal: AbortSignal.timeout(9000),
  })
  if (!r.ok) throw Error('Provider unavailable')
  return r.json()
}
export async function feed(env) {
  if (!env.FINNHUB_API_KEY) throw Error('Market feed needs a server key.')
  const iso = (date) => date.toISOString().slice(0, 10)
  const calendarPath =
    'calendar/earnings?from=' + iso(new Date()) + '&to=' + iso(new Date(Date.now() + 7 * 86400000))
  const [calendar, news, ...quotes] = await Promise.allSettled([
    fromFinnhub(calendarPath, env.FINNHUB_API_KEY),
    fromFinnhub('news?category=general', env.FINNHUB_API_KEY),
    ...baskets.map(([s]) => fromFinnhub('quote?symbol=' + s, env.FINNHUB_API_KEY)),
  ])
  const stories = normalizeStories(news.status === 'fulfilled' ? news.value : [])
  const prices = quotes.flatMap((r, i) =>
    r.status === 'fulfilled' && r.value.c > 0 && Number.isFinite(r.value.dp) && r.value.t
      ? [
          {
            symbol: baskets[i][0],
            name: baskets[i][1],
            group: baskets[i][2],
            price: r.value.c,
            change: r.value.dp,
            time: r.value.t,
          },
        ]
      : [],
  )
  if (!prices.length && !stories.length) throw Error('Market provider unavailable.')
  const primary = prices.find((p) => p.group === 'Index')
  let recap = primary
    ? primary.name +
      ' ' +
      (primary.change >= 0 ? 'rose ' : 'fell ') +
      Math.abs(primary.change).toFixed(2) +
      '% from the previous close.'
    : 'Index quotes are currently unavailable.'
  if (env.OPENAI_API_KEY && primary) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'Summarize only these observed ETF changes in two plain factual sentences. No causes, advice or predictions.',
            },
            { role: 'user', content: JSON.stringify(prices.filter((p) => p.group === 'Index')) },
          ],
        }),
        signal: AbortSignal.timeout(6000),
      })
      const d = await r.json()
      recap = d.choices?.[0]?.message?.content || recap
    } catch {
      /* Use the deterministic recap. */
    }
  }
  const events =
    calendar.status === 'fulfilled' && Array.isArray(calendar.value.earningsCalendar)
      ? calendar.value.earningsCalendar
          .filter((e) => e.date && e.symbol)
          .slice(0, 8)
          .map((e) => ({ date: e.date, symbol: e.symbol }))
      : []
  return { at: Date.now(), stories, prices, recap, events }
}
