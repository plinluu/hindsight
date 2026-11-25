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
  const tape = useRef<HTMLDivElement>(null)
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
    let cleanup = () => {}
    setReady(false)
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      if (kind === 'ticker-tape' && tape.current) {
        const container = tape.current
        const script = document.createElement('script')
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
        script.async = true
        script.textContent = JSON.stringify({
          symbols: [{proName:'FOREXCOM:SPXUSD',title:'US 500'}, {proName:'FOREXCOM:NSXUSD',title:'US Tech 100'}, {proName:'FOREXCOM:DJI',title:'Dow 30'}],
          displayMode:'regular', colorTheme:'dark', locale:'en', isTransparent:true,
          isPaused:window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        })
        const loaded = (event: Event) => {
          if (active && event.target instanceof HTMLIFrameElement) setReady(true)
        }
        container.addEventListener('load', loaded, true)
        cleanup = () => {
          container.removeEventListener('load', loaded, true)
          container.replaceChildren()
        }
        const target = document.createElement('div')
        target.className = 'tradingview-widget-container__widget'
        container.append(target, script)
        return
      }
      load(kind).then(() => { if (active) setReady(true) }, () => {})
    })
    observer.observe(host.current!)
    return () => { active = false; observer.disconnect(); cleanup() }
  }, [kind, online])
  const available = online && ready
  return <div ref={host} className="market-widget">
    {kind === 'ticker-tape' && <div className={'tape-frame' + (available ? '' : ' tape-pending')} aria-hidden={!available}>
      <div className="tradingview-widget-container" ref={tape}/>
    </div>}
    {kind === 'advanced-chart' && available && createElement('tv-advanced-chart', {
      symbol, interval:'1D', theme:'dark', style:{display:'block', width:'100%', height:'clamp(360px, 52vh, 580px)'}
    })}
    {!available && children}
  </div>
}
