import { fromFinnhub, normalizeStories } from '../../server/feed.mjs'

const symbols = ['SPY', 'QQQ', 'DIA']
export default async function briefing(req, res, env = process.env) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.statusCode = 405
    return res.end('{}')
  }
  const key = env.FINNHUB_KEY
  if (!key) {
    res.statusCode = 503
    return res.end('{}')
  }
  const [news, ...quotes] = await Promise.allSettled([
    fromFinnhub('news?category=general', key).then(normalizeStories),
    ...symbols.map(symbol => fromFinnhub('quote?symbol=' + symbol, key)),
  ])
  const stories = news.status === 'fulfilled' ? news.value : []
  const prices = quotes.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return []
    const { c, dp, t } = result.value ?? {}
    return c > 0 && Number.isFinite(dp) && Number.isFinite(t) && t > 0
      ? [{ symbol: symbols[index], change: dp, time: t }]
      : []
  })
  if (!stories.length && !prices.length) res.statusCode = 503
  res.setHeader('Cache-Control', stories.length && prices.length === 3 ? 'public, s-maxage=300' : 'no-store')
  res.end(JSON.stringify({ stories, prices }))
}
