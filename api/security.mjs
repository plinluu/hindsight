import { fields } from "../src/journal/securityFields.js"
const cache = new Map()
async function lookup(symbol, selectedFields) {
  const url = new URL('https://scanner.tradingview.com/symbol')
  url.search = new URLSearchParams({symbol, fields:selectedFields.join(',')})
  const response = await fetch(url, {signal:AbortSignal.timeout(9000)})
  if (!response.ok) throw Error('Provider unavailable')
  const data = await response.json()
  if (!Number.isFinite(data.close)) throw Error('No quote')
  return {symbol, ...data}
}
export default async function security(req,res) {
  res.setHeader('Content-Type','application/json')
  if (req.method !== 'GET') {res.statusCode=405;return res.end('{}')}
  const params = new URL(req.url,'http://localhost').searchParams
  const key = params.get('symbol') || ''
  if (!/^[A-Z0-9_]{1,20}:[A-Z0-9._/-]{1,20}$/.test(key)) {
    res.statusCode=400
    return res.end('{}')
  }
  try {
    let entry=cache.get(key)
    if (!entry || Date.now()-entry.at>60000) {
      const data = await lookup(key,fields)
      entry={at:Date.now(),data}
      if(cache.size>=300) cache.delete(cache.keys().next().value)
      cache.set(key,entry)
    }
    res.setHeader('Cache-Control','public, max-age=30, s-maxage=60')
    res.end(JSON.stringify(entry))
  } catch {
    res.statusCode=503
    res.end(JSON.stringify({error:'Source unavailable'}))
  }
}
