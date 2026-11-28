export function SecurityProfile({ symbol, name }: { symbol: string; name: string }) {
  const url = 'https://www.tradingview.com/symbols/' + encodeURIComponent(symbol.replace(':', '-')) + '/'
  return <article className="security-profile">
    <div className="security-heading"><div><span>{symbol.replace(':', ' · ')}</span><h2>{name}</h2></div></div>
    <footer><a href={url} target="_blank" rel="noreferrer">View company details on TradingView ↗</a></footer>
  </article>
}
