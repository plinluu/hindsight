const fields = [
  'description','close','change','currency','fundamental_currency_code','market_cap_basic','enterprise_value_fq',
  'price_earnings_ttm','earnings_per_share_basic_ttm','total_revenue_ttm','net_income_ttm','sector','industry',
  'number_of_employees','volume','price_52_week_low','price_52_week_high','ipo_offer_date','ipo_offer_price_usd',
  'exchange','type','update_mode','total_shares_outstanding'
]
const indices = ['^GSPC','^IXIC','^DJI']
async function indexQuote(symbol) {
  const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range=1d&interval=1d'
  const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(9000)})
  if (!response.ok) throw Error('Index quote unavailable')
  const {meta}= (await response.json()).chart.result[0]
  const close=meta.regularMarketPrice
  if (!Number.isFinite(close)) throw Error('No index price')
  const previous=meta.previousClose ?? meta.chartPreviousClose
  const change=meta.regularMarketChangePercent ?? (previous>0 ? (close/previous-1)*100 : null)
  return {symbol,close,change}
}
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
  if (key !== 'indices' && !/^[A-Z0-9_]{1,20}:[A-Z0-9._/-]{1,20}$/.test(key)) {
    res.statusCode=400
    return res.end('{}')
  }
  try {
    let entry=cache.get(key)
    if (!entry || Date.now()-entry.at>60000) {
      const data = key==='indices'
        ? await Promise.all(indices.map(indexQuote))
        : await lookup(key,fields)
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
