import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import Papa from 'papaparse'
import {buildDemo} from './review/demo'
import {makeTrade, flagRevenge, enrichTrades, regretRows, addDays} from './review/calculations'
import {renderReport} from './review/report'
import {MarketWidget} from './journal/MarketWidget'
import companies from './journal/companies.json'
import type {Sale} from './trades'

type Point = {d:string;c:number}
type Series = Record<string,Point[]>
type Trade = ReturnType<typeof makeTrade>
const savedPrices = new WeakMap<Sale[],Series>()
const demo = buildDemo() as {series:Series;trades:Trade[]}
const listings = new Map(companies.map(row=>[row[1].split(':')[1],row[1]]))
const latestDay = () => new Date().toISOString().slice(0,10)
function mergePoints(existing:Point[], incoming:Point[]) {
  const days = new Map(existing.map(p=>[p.d,p]))
  for(const p of incoming) days.set(p.d,p)
  return [...days.values()].sort((a,b)=>a.d.localeCompare(b.d))
}
function parseHistory(text:string):Point[] {
  const {data} = Papa.parse<Record<string,string>>(text,{header:true,skipEmptyLines:true,transformHeader:h=>h.trim().toLowerCase()})
  const points=data.flatMap(row=>{
    const raw=row.time || row.date || ''
    const date=/^\d{10,13}$/.test(raw)?new Date(+raw*(raw.length===10?1000:1)):new Date(raw)
    const close=Number(row.close)
    if(!Number.isFinite(+date) || !(close>0) || !Number.isFinite(close))return []
    return [{d:date.toISOString().slice(0,10),c:close}]
  })
  if(!points.length) throw Error('Choose a chart CSV with Time or Date and Close columns.')
  return points
}
function PriceSource({ticker,target,onAdd}:{ticker:string;target:string;onAdd:(points:Point[])=>void}) {
  const [status,message]=useState(''), [price,setPrice]=useState('')
  const symbol=listings.get(ticker)??ticker
  const future=target>latestDay()
  return <details className="review-prices"><summary>TradingView prices for {ticker}</summary>
    <MarketWidget kind="advanced-chart" symbol={symbol}><p>Use the full TradingView chart below to look up a close.</p></MarketWidget>
    <a href={'https://www.tradingview.com/chart/?symbol='+encodeURIComponent(symbol)} target="_blank" rel="noreferrer">Open {symbol} on TradingView ↗</a>
    <p>Use the same listing and currency as your broker file. Import daily or weekly closes to fill the chart, all three comparisons, and the four-week momentum check.</p>
    <label>Import TradingView chart history for {ticker}<input type="file" accept=".csv,text/csv" onChange={async e=>{
      const file=e.target.files?.[0];if(!file)return
      try{if(file.size>8*1024*1024)throw Error('Choose a chart CSV under 8 MB.')
        const points=parseHistory(await file.text());onAdd(points);message(points.length+' closing prices added.')
      }catch(err){message((err as Error).message)}
    }}/></label>
    {symbol.includes(':') && <button onClick={async()=>{
      try{const r=await fetch('/api/security?symbol='+encodeURIComponent(symbol),{signal:AbortSignal.timeout(12000)})
        if(!r.ok)throw Error();const {data,at}=await r.json();if(!(data?.close>0))throw Error()
        onAdd([{d:new Date(at).toISOString().slice(0,10),c:data.close}]);message('Latest available TradingView quote added.')
      }catch{message('Quote could not be loaded. Import a chart CSV or enter a close below.')}
    }}>Get latest quote</button>}
    {future?<p>This comparison opens on {target}.</p>:<form onSubmit={e=>{e.preventDefault();onAdd([{d:target,c:+price}]);message('Closing price added for '+target);setPrice('')}}>
      <label>Closing price on or before {target}<input type="number" min="0" step="any" value={price} onChange={e=>setPrice(e.target.value)}/></label>
      <button disabled={!(+price>0)}>Use this close</button>
    </form>}<p role="status">{status}</p>
  </details>
}
export default function Results({sales}:{sales?:Sale[]}) {
  const root=useRef<HTMLDivElement>(null)
  const [history,setHistory]=useState<Series>(()=>sales?savedPrices.get(sales)??{}:{}),[selection,select]=useState<number|null>(null),[horizon,setHorizon]=useState(0)
  const [hideTicker,maskTicker]=useState(false),[hideAmounts,maskAmounts]=useState(false),[width,setWidth]=useState(0)
  useEffect(()=>{if(sales)savedPrices.set(sales,history)},[sales,history])
  const series:Series=sales?history:demo.series
  const trades:Trade[]=useMemo(()=>{
    const lots=sales?sales.map(s=>makeTrade({tk:s.symbol,bd:s.buy,sd:s.sell,bp:s.entry,sp:s.exit,q:s.quantity,fee:s.fees-s.fx,fx:s.fx})):demo.trades.map((s:Trade)=>({...s}))
    enrichTrades(lots,series);flagRevenge(lots);return lots
  },[sales,series])
  const best=useMemo(()=>regretRows(trades,series,horizon).reduce((best,row)=>!best || row.c>best.c?row:best,null),[trades,series,horizon])
  const index=selection!=null && selection<trades.length?selection:best?trades.indexOf(best.t):0
  const trade=trades[index], target=horizon?addDays(trade.sd,horizon):latestDay()
  useEffect(()=>{
    const node=root.current;if(!node)return
    const observer=new ResizeObserver(([entry])=>setWidth(Math.round(entry.contentRect.width)))
    observer.observe(node);return ()=>observer.disconnect()
  },[])
  useLayoutEffect(()=>{
    if(root.current)return renderReport(root.current,{trades,series,horizon,mode:sales?'mine':'demo',selected:index,hideTicker,hideAmounts},select)
  },[trades,series,horizon,sales,index,hideTicker,hideAmounts,width])
  return <div className="review-report" ref={root}>
    <section className="glass" id="review-chart"><small>{sales?'Your trades · private':'Demo portfolio · simulated prices'}</small>
      <h2>One sale, up close</h2><p id="review-sent" aria-live="polite"/>
      <div className="sale-switch" role="group" aria-label="Price after the sale">{[0,30,90].map(n=><button key={n} aria-pressed={horizon===n} onClick={()=>setHorizon(n)}>{n?n+' days':'Today'}</button>)}</div>
      <div id="results-chart"/><div className="sale-key"><span>━ Share price</span><span>■ Left on the table</span><span>■ Saved by selling</span></div>
      {trades.length<=30?<div className="sale-switch" role="group" aria-label="Choose a trade">{trades.map((t,i)=><button key={i} title={t.bd+' → '+t.sd} aria-pressed={index===i} onClick={()=>select(i)}>{t.tk}</button>)}</div>:
      <label>Choose a trade<select value={index} onChange={e=>select(+e.target.value)}>{trades.map((t,i)=><option key={i} value={i}>{t.tk} · {t.sd} · {t.q} shares</option>)}</select></label>}
      <p>{trade.q} shares · Bought {trade.bd} · Sold {trade.sd}{series[trade.tk]?.length?' · Latest available close '+series[trade.tk].at(-1)!.d:''}</p>
      {sales && <PriceSource key={trade.tk} ticker={trade.tk} target={target} onAdd={points=>setHistory(old=>({...old,[trade.tk]:mergePoints(old[trade.tk]??[],points)}))}/>}
    </section>
    <section className="glass"><h2>What you gave up by selling</h2><p>Compare each exit with the selected later price. Your actual profit and the change after selling are shown separately.</p>
      <div id="kpi"/><div className="review-pair"><div className="glass-inset"><h3>Largest missed gains</h3><div id="lb"/></div><div className="glass-inset"><h3>Running profit after fees</h3><div id="cum"/></div></div>
    </section>
    <section className="glass"><h2>What the broker kept</h2><div id="fees-body"/></section>
    <section className="glass"><h2>Three patterns worth checking</h2><div id="fp"/></section>
    <section className="glass"><h2>Every trade in one picture</h2><p>Preview your share card. Hide amounts to show percentages, or hide symbols to label each row by trade number.</p>
      <div className="glass-inset share-preview"><canvas id="share-canvas"/></div><div className="review-actions"><label><input type="checkbox" checked={hideTicker} onChange={e=>maskTicker(e.target.checked)}/> Hide ticker names</label>
      <label><input type="checkbox" checked={hideAmounts} onChange={e=>maskAmounts(e.target.checked)}/> Hide dollar amounts</label></div>
      <div className="review-actions"><button id="share-download">Download PNG</button><button id="export">Export trades as CSV</button></div><p id="share-msg" role="status"/>
    </section>
  </div>
}
