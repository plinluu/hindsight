const baskets = [
  ['SPY', 'S&P 500 tracker', 'Index'],
  ['QQQ', 'Nasdaq-100 tracker', 'Index'],
  ['DIA', 'Dow tracker', 'Index'],
  ['XLK', 'Technology', 'Sector'],
  ['XLF', 'Financials', 'Sector'],
  ['XLE', 'Energy', 'Sector'],
  ...['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'].map((s) => [s, s, 'Stock']),
]
async function fromFinnhub(path, key) {
  const r = await fetch('https://finnhub.io/api/v1/' + path, {
    headers: { 'X-Finnhub-Token': key },
    signal: AbortSignal.timeout(9000),
  })
  if (!r.ok) throw Error('Provider unavailable')
  return r.json()
}
const cleanUrl = (url) => {
  try {
    const u = new URL(url)
    return ['https:', 'http:'].includes(u.protocol) ? u.href : null
  } catch {
    return null
  }
}
const explain = {
  forex: 'Currency moves change the local cost of imports and overseas sales.',
  crypto: 'Changes in crypto demand can affect prices across digital assets.',
  merger: 'A deal can change how investors value both companies.',
  general: 'This report gives context for the market moves in your recap.',
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
  const seen = new Set()
  const stories = (news.status === 'fulfilled' && Array.isArray(news.value) ? news.value : [])
    .filter((n) => {
      const url = cleanUrl(n.url),
        id = n.headline?.trim().toLowerCase()
      if (!id || !url || !n.datetime || seen.has(id) || seen.has(url)) return false
      seen.add(id)
      seen.add(url)
      return true
    })
    .slice(0, 60)
    .map((n) => {
      const h = n.headline.toLowerCase(),
        category = /earnings|revenue|profit/.test(h)
          ? 'Earnings'
          : /rate cut|inflation|fed\b|tariff/.test(h)
            ? 'Economy'
            : /acqui|merger/.test(h)
              ? 'Deals'
              : 'Markets'
      return {
        headline: n.headline,
        url: cleanUrl(n.url),
        source: n.source,
        time: n.datetime,
        category,
        tone: /\b(slumps?|falls?|drops?|losses)\b/.test(h)
          ? 'Negative'
          : /\b(rallies|rises?|gains?|surges?)\b/.test(h)
            ? 'Positive'
            : 'Neutral',
        why:
          category === 'Earnings'
            ? 'Reported profits help investors reassess what a company could earn.'
            : category === 'Economy'
              ? 'Economic policy can change borrowing costs and demand.'
              : category === 'Deals'
                ? explain.merger
                : (explain[n.category] ?? explain.general),
      }
    })
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
