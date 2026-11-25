import {useEffect, useId, useRef, useState} from 'react'
import type {Sale} from './trades'
import {MarketWidget} from './journal/MarketWidget'
import companies from './journal/companies.json'

const day = 86400000
const iso = (time: number) => new Date(time).toISOString().slice(0,10)
const amount = (n: number) => n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})
type Point = {time:number; price:number}
type Window = 'Today' | '30 days' | '90 days'
const today = Date.parse(iso(Date.now()))
export const demoSales: Sale[] = [
  ['FLUX',255.36,302.03,15], ['AURX',82.50,76.20,24], ['CYNO',34.75,41.60,80],
].map(([symbol,entry,exit,quantity],i) => {
  const sold = today - (270 + i*18)*day, days = 45 + i*4
  return {symbol:String(symbol),entry:+entry,exit:+exit,quantity:+quantity,buy:iso(sold-days*day),sell:iso(sold),days,fees:2,net:(+exit-+entry)*+quantity-2}
})
const listedSymbols = new Map(companies.map(row=>[row[1].split(':')[1],row[1]]))
const listing = (symbol:string) => listedSymbols.get(symbol) ?? symbol
function demoSeries(s:Sale, end:number) {
  const buy=Date.parse(s.buy), sell=Date.parse(s.sell)
  const final = s.symbol==='FLUX' ? 626.17 : s.exit*(s.symbol==='AURX' ? .71 : 1.22)
  const anchors=[[buy-48*day,s.entry*.86],[buy,s.entry],[sell,s.exit],[sell+30*day,s.exit*.96],[sell+90*day,s.exit*1.12],[today,final]]
  const points:Point[]=[]
  for(let i=1;i<anchors.length;i++){
    const [a,p]=anchors[i-1], [b,q]=anchors[i]
    for(let time=a;time<b && time<=end;time+=day){
      const t=(time-a)/(b-a)
      const wave=Math.sin(Math.PI*t)*(Math.sin(t*16+i)*.035+Math.sin(t*68)*.009)
      points.push({time,price:p+(q-p)*t+p*wave})
    }
  }
  if(end===today) points.push({time:today,price:final})
  return points
}
function Plot({points,sale,demo}:{points:Point[];sale:Sale;demo:boolean}) {
  const ref=useRef<SVGSVGElement>(null), [width,setWidth]=useState(720), id=useId()
  useEffect(()=>{
    if(!ref.current)return
    const observer=new ResizeObserver(([box])=>{if(box.contentRect.width)setWidth(box.contentRect.width)})
    observer.observe(ref.current)
    return ()=>observer.disconnect()
  },[])
  const left=54,right=width-12,top=35,bottom=181
  const prices=points.map(p=>p.price), min=Math.min(...prices),max=Math.max(...prices),pad=(max-min)*.12 || max*.05 || 1
  const first=points[0].time,last=points.at(-1)!.time
  const x=(t:number)=>left+(right-left)*(last===first?.5:(t-first)/(last-first))
  const y=(p:number)=>bottom-(bottom-top)*(p-min+pad)/(max-min+2*pad)
  const coords=(p:Point)=>x(p.time)+','+y(p.price)
  const sell=Date.parse(sale.sell), line=points.map(coords).join(' ')
  const post=points.filter(p=>p.time>=sell), baseline=y(sale.exit)
  const area=x(sell)+','+baseline+' '+post.map(coords).join(' ')+' '+x(last)+','+baseline
  return <svg ref={ref} className="sale-plot" viewBox={'0 0 '+width+' 217'} role="img" aria-label={sale.symbol+' price comparison. Bought at '+amount(sale.entry)+', sold at '+amount(sale.exit)+'.'}>
    <defs><clipPath id={id+'up'}><rect width={width} height={Math.max(0,baseline)}/></clipPath><clipPath id={id+'down'}><rect y={baseline} width={width} height="217"/></clipPath></defs>
    {[0,1,2,3].map(i=>{const v=min-pad+(max-min+2*pad)*i/3;return <g key={i}><line x1={left} x2={right} y1={y(v)} y2={y(v)} stroke="#ffffff20"/><text x={left-6} y={y(v)+4} textAnchor="end">{v.toLocaleString(undefined,{maximumFractionDigits:1,notation:'compact'})}</text></g>})}
    {demo && <><polygon points={area} fill="#ee9aaf55" clipPath={'url(#'+id+'up)'}/><polygon points={area} fill="#89d9bd55" clipPath={'url(#'+id+'down)'}/></>}
    <line x1={x(sell)} x2={right} y1={baseline} y2={baseline} stroke="#d4c3d1" strokeDasharray="3 5"/>
    <polyline points={line} fill="none" stroke="#f6efe6" strokeWidth="2.4" strokeLinejoin="round" strokeDasharray={demo?undefined:'4 5'}/>
    {[[Date.parse(sale.buy),sale.entry],[sell,sale.exit]].map(([t,p],i)=><g key={i}><circle cx={x(t)} cy={y(p)} r="4.5" fill={i?'#f8e9d2':'#343243'} stroke="#f8e9d2" strokeWidth="2"/><text x={Math.max(left+16,Math.min(right-16,x(t)))} y={y(p)+(i?-11:18)} textAnchor="middle">{i?'Sold':'Bought'}</text></g>)}
    {[first,...(width>520 && last>first+3*day?[(first+last)/2]:[]),...(last!==first?[last]:[])].map((t,i)=><text key={t} x={x(t)} y="210" textAnchor={i===0?'start':t===last?'end':'middle'}>{iso(t)}</text>)}
  </svg>
}

export default function SaleChart({sales=demoSales,demo=false}:{sales?:Sale[];demo?:boolean}) {
  const [index,select]=useState(0),[period,setPeriod]=useState<Window>('Today')
  const [opened,setOpened]=useState(false),[values,setValues]=useState<Record<string,number>>({})
  const [quotes,setQuotes]=useState<Record<string,number|null>>({})
  const s=sales[index]??sales[0], sell=Date.parse(s.sell)
  const end=period==='Today'?today:sell+parseInt(period)*day, future=end>today
  const symbol=listing(s.symbol)
  useEffect(()=>{
    if(!opened || demo || !symbol.includes(':'))return
    const abort=new AbortController()
    fetch('/api/security?symbol='+encodeURIComponent(symbol),{signal:abort.signal}).then(r=>r.json()).then(v=>{
      if(!abort.signal.aborted)setQuotes(q=>({...q,[symbol]:v.data?.close>0?v.data.close:null}))
    }).catch(()=>{})
    return ()=>abort.abort()
  },[opened,demo,symbol])
  const key=symbol+'|'+iso(end), typed=values[key]
  const known=typed??(period==='Today' && opened?quotes[symbol]:undefined)
  const points=demo?demoSeries(s,end):[{time:Date.parse(s.buy),price:s.entry},{time:sell,price:s.exit},...(!future && known!=null?[{time:end,price:known}]:[])]
  const close=demo?points.at(-1)!.price:future?undefined:known, diff=close!=null?(close-s.exit)*s.quantity:null
  const fmt=(n:number)=>(demo?'$':'')+amount(n)
  const comparisons = sales.flatMap((lot,i)=>{
    const target=period==='Today'?today:Date.parse(lot.sell)+parseInt(period)*day
    if(target>today) return []
    const ticker=listing(lot.symbol)
    const price=demo?demoSeries(lot,target).at(-1)?.price:values[ticker+'|'+iso(target)]??(period==='Today'?quotes[ticker]:undefined)
    return price==null?[]:[{i,lot,difference:(price-lot.exit)*lot.quantity}]
  }).sort((a,b)=>b.difference-a.difference)
  return <section className="panel sale-card">
    <span className="sale-tag">{demo?'Demo portfolio · simulated prices':'Your trade · broker figures'}</span>
    <h2>You sold <strong>{s.symbol}</strong> at {fmt(s.exit)}.</h2>
    <p className="sale-outcome" aria-live="polite">{diff==null?
      <>{s.quantity} shares bought at {fmt(s.entry)}. Your result after fees was <strong>{fmt(s.net)}</strong>.</>:
      <>{period==='Today'?'Latest price':period+' later'} · {fmt(close!)}. {diff===0?'The price stayed the same.':<>Holding those {s.quantity} shares would have been worth <strong>{fmt(Math.abs(diff))} {diff>0?'more':'less'}</strong> before fees.</>}</>}</p>
    <div className="sale-switch" role="group" aria-label="Price after the sale">{(['Today','30 days','90 days'] as const).map(v=><button key={v} aria-pressed={period===v} onClick={()=>setPeriod(v)}>{v}</button>)}</div>
    <Plot points={points} sale={s} demo={demo}/>
    <div className="sale-key">{demo?<><span>━ Price per share</span><span>🞄 Above sale price</span><span>🞄 Below sale price</span></>:<span>Dashed line connects recorded prices</span>}</div>
    {sales.length<=12?<div className="sale-switch trades" role="group" aria-label="Choose a sale">{sales.map((r,i)=><button key={i} aria-pressed={index===i} onClick={()=>{select(i);setOpened(false)}}>{r.symbol}{sales.filter(v=>v.symbol===r.symbol).length>1?' · '+(i+1):''}</button>)}</div>:
    <label>Choose a sale<select value={index} onChange={e=>{select(+e.target.value);setOpened(false)}}>{sales.map((r,i)=><option key={i} value={i}>{r.symbol} · {r.sell} · {r.quantity} shares from {r.buy}</option>)}</select></label>}
    {!demo && <div className="sale-source">
      <p>Bought {s.buy} · Sold {s.sell} · {s.quantity} shares</p>
      {!opened?<button onClick={()=>setOpened(true)}>Compare with TradingView</button>:<>
        <MarketWidget key={symbol} kind="advanced-chart" symbol={symbol}><p>Explore {symbol} on the linked TradingView chart.</p></MarketWidget>
        <a target="_blank" rel="noreferrer" href={'https://www.tradingview.com/chart/?symbol='+encodeURIComponent(symbol)}>Open {symbol} on TradingView ↗</a>
        {future?<p>This sale reaches {period} on {iso(end)}.</p>:<label>{period==='Today'?'Latest close':'Close on or before '+iso(end)} · use the same listing and currency as your trade
          <input key={key} type="number" min="0" step="any" placeholder={known!=null?String(known):'Enter closing price from chart'} defaultValue={typed} onChange={e=>{const n=e.target.valueAsNumber;setValues(v=>{const next={...v};if(n>0)next[key]=n;else delete next[key];return next})}}/>
          <small>{typed!=null?'Using your entered close.':period==='Today' && known!=null?'Using the latest available TradingView quote.':'Read the closing price on TradingView to calculate the difference.'}</small>
        </label>}
      </>}
    </div>}
    {comparisons.length>1 && <details className="sale-ranking"><summary>Compare sales · {period}</summary>
      <p>Change in the value of the shares after each sale, before fees. Only sales with a comparison price appear here.</p>
      <ol>{comparisons.map(({i,lot,difference})=><li key={i}><button aria-pressed={i===index} onClick={()=>{select(i);setOpened(false)}}>{lot.symbol} · {lot.sell}</button><span>{fmt(Math.abs(difference))} {difference>0?'higher':difference<0?'lower':'change'}</span></li>)}</ol>
    </details>}
  </section>
}
