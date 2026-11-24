import { useEffect, useRef, useState } from 'react'
export const defaults = ['NASDAQ:AAPL', 'NASDAQ:MSFT', 'AMEX:SPY', 'NASDAQ:QQQ']
export const chartTools = {
  'Market overview': 'market-overview',
  'Symbol overview': 'symbol-overview',
  'Economic calendar': 'events',
  'Stock screener': 'screener',
  'Ticker tape': 'ticker-tape',
}
export function Widget({ kind, symbol, theme }: { kind: string; symbol: string; theme: string }) {
  const host = useRef<HTMLDivElement>(null),
    [failed, fail] = useState(false)
  useEffect(() => {
    const root = host.current!
    const holder = document.createElement('div')
    holder.className = 'tradingview-widget-container'
    holder.style.height = '100%'
    const target = document.createElement('div')
    target.className = 'tradingview-widget-container__widget'
    holder.append(target)
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-' + kind + '.js'
    const symbols = defaults.map((s) => ({ s, d: s.split(':')[1] }))
    const options: Record<string, unknown> = {
      width: '100%',
      height: '100%',
      locale: 'en',
      colorTheme: theme,
      theme,
      isTransparent: false,
    }
    if (kind === 'market-overview')
      Object.assign(options, { tabs: [{ title: 'Markets', symbols }], showChart: true, dateRange: '1M' })
    if (kind === 'symbol-overview')
      Object.assign(options, { symbols: [[symbol.split(':')[1], symbol + '|1M']], chartType: 'area' })
    if (kind === 'events')
      Object.assign(options, { countryFilter: 'us,ca', importanceFilter: '0,1', displayMode: 'regular' })
    if (kind === 'screener')
      Object.assign(options, {
        market: 'america',
        defaultScreen: 'most_capitalized',
        defaultColumn: 'overview',
      })
    if (kind === 'ticker-tape')
      Object.assign(options, {
        symbols: defaults.map((proName) => ({ proName })),
        displayMode: 'adaptive',
        isPaused: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        showSymbolLogo: true,
      })
    script.textContent = JSON.stringify(options)
    script.onerror = () => fail(true)
    fail(false)
    holder.append(script)
    root.append(holder)
    const timer = setTimeout(() => {
      if (!root.querySelector('iframe')) fail(true)
    }, 12000)
    return () => {
      clearTimeout(timer)
      holder.remove()
    }
  }, [kind, symbol, theme])
  return (
    <>
      <div ref={host} style={{ height: kind === 'ticker-tape' ? 80 : 420 }} />
      {failed && <p>The embedded view is unavailable.</p>}
      <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">
        View on TradingView
      </a>
    </>
  )
}
