export default function Briefing({ preview = false }: { preview?: boolean }) {
  return <div className="news-brief">
    <section className="glass">
      <h2>Market recap</h2>
      <p>Check the latest index fund moves on TradingView.</p>
      <ul className="fund-moves">
        <li><a href="https://www.tradingview.com/symbols/AMEX-SPY/">S&amp;P 500 · SPY</a></li>
        <li><a href="https://www.tradingview.com/symbols/NASDAQ-QQQ/">Nasdaq-100 · QQQ</a></li>
        <li><a href="https://www.tradingview.com/symbols/AMEX-DIA/">Dow Jones · DIA</a></li>
      </ul>
    </section>
    <section className="glass">
      <h2>{preview ? 'Market headlines' : 'Across the news'}</h2>
      <p>Read market coverage on the publishers’ websites.</p>
      <ul className="fund-moves">
        <li><a href="https://www.cnbc.com/markets/">CNBC Markets</a></li>
        <li><a href="https://www.marketwatch.com/">MarketWatch</a></li>
      </ul>
    </section>
  </div>
}
