import {useEffect, useRef, useState} from 'react'

const staticHosting = import.meta.env.BASE_URL === '/hindsight/'

function SymbolInfo({symbol}:{symbol:string}) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const container = document.createElement('div')
    container.className = 'tradingview-widget-container'
    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js'
    script.async = true
    script.textContent = JSON.stringify({symbol, width:'100%', locale:'en', colorTheme:'dark', isTransparent:true})
    script.onerror = () => setFailed(true)
    container.append(widget, script)
    host.current?.append(container)
    return () => { script.onerror = null; container.remove() }
  }, [symbol])
  return <><div ref={host}/>{failed && <p role="status">Open TradingView below to see details for {symbol}.</p>}</>
}

type Quote = {symbol:string;close:number;change:number|null}
type Profile = Quote & {
  description?:string;currency?:string;fundamental_currency_code?:string;market_cap_basic?:number;enterprise_value_fq?:number
  price_earnings_ttm?:number;earnings_per_share_basic_ttm?:number;total_revenue_ttm?:number;net_income_ttm?:number
  sector?:string;industry?:string;number_of_employees?:number;volume?:number;price_52_week_low?:number;price_52_week_high?:number
  ipo_offer_date?:number;ipo_offer_price_usd?:number;exchange?:string;type?:string;update_mode?:string;total_shares_outstanding?:number
}
type Result<T> = {key:string;at:number;data:T|null}
function useSource<T>(key:string) {
  const [result,setResult] = useState<Result<T>>()
  useEffect(()=>{
    if (staticHosting) return
    const controller = new AbortController()
    async function refresh() {
      try {
        const response = await fetch('/api/security?symbol='+encodeURIComponent(key),{signal:controller.signal})
        if (!response.ok) throw Error()
        const {at,data} = await response.json()
        if (!controller.signal.aborted) setResult({key,at,data})
      } catch {
        if (!controller.signal.aborted) setResult(previous => previous?.key===key ? previous : {key,at:0,data:null})
      }
    }
    void refresh()
    const timer = setInterval(refresh,60000)
    return ()=>{controller.abort();clearInterval(timer)}
  },[key])
  return result?.key===key ? result : undefined
}
function number(n:number|undefined|null, currency?:string, compact=false) {
  if (typeof n!=='number' || !Number.isFinite(n)) return 'Not reported'
  return n.toLocaleString('en-US',{style:currency?'currency':'decimal',currency,notation:compact?'compact':'standard',maximumFractionDigits:2})
}
function Change({n}:{n:number|null}) {
  if (n==null) return <span>—</span>
  return <span className={n>0?'market-gain':n<0?'market-loss':''}>{n>0?'+':''}{n.toFixed(2)}%</span>
}
export function SecurityProfile({symbol,name}:{symbol:string;name:string}) {
  const result = useSource<Profile>(symbol)
  const p = result?.data
  const url='https://www.tradingview.com/symbols/'+encodeURIComponent(symbol.replace(':','-'))+'/'
  const c=p?.currency, f=p?.fundamental_currency_code || c
  const facts = (pairs:string[][]) => <dl className="security-facts">{pairs.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
  const fund = p?.type==='fund'
  return <article className="security-profile">
    <div className="security-heading"><div><span>{symbol.replace(':',' · ')}</span><h2>{p?.description || name}</h2>
      {p && <p>{[p.sector,p.industry].filter(Boolean).join(' · ')}</p>}</div>
      {p && <div className="security-price"><strong>{number(p.close,c)}</strong><div><Change n={p.change}/> today</div></div>}
    </div>
    {!p ? (staticHosting || result ? <SymbolInfo key={symbol} symbol={symbol}/> :
      <p role="status">Loading company details…</p>) : <>
      <h3>{fund?'Fund snapshot':'Valuation'}</h3>
      {facts([['Market cap',number(p.market_cap_basic,c,true)],['Enterprise value',number(p.enterprise_value_fq,f,true)],['Price / earnings',p.price_earnings_ttm==null?'Not reported':number(p.price_earnings_ttm)+'×'],['Shares outstanding',number(p.total_shares_outstanding,undefined,true)]])}
      <h3>Trading &amp; financials</h3>
      {facts([['52-week low',number(p.price_52_week_low,c)],['52-week high',number(p.price_52_week_high,c)],['Trading volume',number(p.volume,undefined,true)],['Earnings per share',number(p.earnings_per_share_basic_ttm,f)],['Revenue · last 12 months',number(p.total_revenue_ttm,f,true)],['Net income · last 12 months',number(p.net_income_ttm,f,true)]])}
      <h3>{fund?'Listing':'Company & IPO'}</h3>
      {facts([['Exchange',p.exchange || 'Not reported'],['Employees',number(p.number_of_employees)],['IPO date',p.ipo_offer_date ? new Date(p.ipo_offer_date*1000).toLocaleDateString('en-US',{timeZone:'UTC',year:'numeric',month:'short',day:'numeric'}) : 'Not reported'],['IPO offer price',number(p.ipo_offer_price_usd,'USD')]])}
    </>}
    <footer><a href={url} target="_blank" rel="noreferrer">Source: TradingView ↗</a>{result?.at ? <span>Retrieved {new Date(result.at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} · quotes may be delayed</span>:null}</footer>
  </article>
}
