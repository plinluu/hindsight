import {useState, type ReactNode} from 'react'

function chartUrl(symbol: string) {
  const settings = { symbol, interval: 'D', theme: 'dark', autosize: true, width: '100%', height: '100%' }
  return 'https://www.tradingview-widget.com/embed-widget/advanced-chart/#' + encodeURIComponent(JSON.stringify(settings))
}

export function MarketWidget({symbol = 'AMEX:SPY', children}: {symbol?: string, children: ReactNode}) {
  const [loadedSymbol, setLoadedSymbol] = useState<string>()
  const valid = /^[A-Z0-9._^/:-]{1,64}$/i.test(symbol)
  const url = 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(symbol)
  return <div className="market-widget">
    {valid && loadedSymbol === symbol ? <>
      <iframe title={'TradingView chart for ' + symbol} sandbox="allow-scripts allow-same-origin allow-popups"
        referrerPolicy="no-referrer" src={chartUrl(symbol)}
        style={{display:'block', width:'100%', height:'clamp(360px, 52vh, 580px)', border:0}} />
      <a href={url} target="_blank" rel="noreferrer">Chart by TradingView ↗</a>
    </> : <>
      {children}
      <div className="market-controls">
        {valid ? <>
          <p>Loading the live chart contacts TradingView and shares the selected symbol.</p>
          <button type="button" onClick={() => setLoadedSymbol(symbol)}>Load TradingView chart</button>
        </> : <a href={url} target="_blank" rel="noreferrer">Open chart on TradingView ↗</a>}
      </div>
    </>}
  </div>
}
