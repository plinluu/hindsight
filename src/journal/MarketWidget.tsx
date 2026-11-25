import {createElement, useEffect, useRef, useState, type ReactNode} from 'react'

type Kind = 'advanced-chart' | 'ticker-tape'
const modules = new Map<Kind, Promise<void>>()

function load(kind: Kind) {
  let pending = modules.get(kind)
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.type = 'module'
      script.src = 'https://widgets.tradingview-widget.com/w/en/tv-' + kind + '.js'
      script.onerror = reject
      script.onload = () => customElements.whenDefined('tv-' + kind).then(() => resolve())
      document.head.append(script)
    })
    modules.set(kind, pending)
  }
  return pending
}

export function MarketWidget({kind, symbol, children}: {kind: Kind, symbol?: string, children: ReactNode}) {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [sample, setSample] = useState(false)
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])
  useEffect(() => {
    if (!online) return
    let active = true
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      load(kind).then(() => { if (active) setReady(true) }, () => {})
    })
    observer.observe(host.current!)
    return () => { active = false; observer.disconnect() }
  }, [kind, online])
  const available = online && ready
  const attrs = kind === 'advanced-chart'
    ? {symbol, interval:'1D', style:{display:'block', width:'100%', height:'clamp(360px, 52vh, 580px)'}}
    : {symbols:'SP:SPX,NASDAQ:IXIC,TVC:DJI', style:{display:'block',width:'100%'}}
  return <div ref={host} className="market-widget">
    {available && <div hidden={sample}>{createElement('tv-' + kind, {...attrs, theme:'dark'})}</div>}
    {(!available || sample) && children}
    {available && <button className="sample-switch" onClick={() => setSample(!sample)}>{sample ? 'Show TradingView' : 'Show sample data'}</button>}
  </div>
}
