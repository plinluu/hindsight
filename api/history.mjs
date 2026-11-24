const cache = new Map()
export default async function history(req, res, env = process.env) {
  res.setHeader('Content-Type', 'application/json')
  const symbol = new URL(req.url, 'http://localhost').searchParams.get('symbol') ?? ''
  if (req.method !== 'GET' || !/^([A-Z0-9.-]{1,12})$/.test(symbol)) {
    res.statusCode = 400
    return res.end('{}')
  }
  try {
    let entry = cache.get(symbol)
    if (!entry || Date.now() - entry.at > 43200000) {
      if (!env.ALPHAVANTAGE_KEY) throw Error()
      const u = new URL('https://www.alphavantage.co/query')
      u.search = new URLSearchParams({
        function: 'TIME_SERIES_WEEKLY',
        symbol,
        apikey: env.ALPHAVANTAGE_KEY,
      }).toString()
      const response = await fetch(u, { signal: AbortSignal.timeout(12000) })
      const data = await response.json()
      const points = Object.entries(data['Weekly Time Series'] ?? {})
        .map(([date, v]) => ({ date, close: Number(v['4. close']) }))
        .filter((p) => p.close > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
      if (!points.length) throw Error()
      entry = { points, at: Date.now() }
      if (cache.size >= 128) cache.delete(cache.keys().next().value)
      cache.set(symbol, entry)
    }
    res.end(JSON.stringify(entry.points))
  } catch {
    res.statusCode = 503
    res.end('{"error":"Price history unavailable"}')
  }
}
