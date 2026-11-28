import {journalHref} from './routes'
import Weather from '../Weather'
import Briefing from './Briefing'
import {MarketWidget} from './MarketWidget'
import type {ReactNode} from 'react'
export function Panel({title,children}:{title:string,children:ReactNode}){return <section className="glass"><div className="row"><h2>{title}</h2><small>Sample data</small></div>{children}</section>}
export function Chart(){return <Panel title="Market chart"><div className="quote"><div><b>SPY</b> · S&P 500 ETF<p>A fund tracking 500 large US companies.</p></div><div><strong>$512.40</strong><em>+0.82% today</em></div></div><svg className="chart" viewBox="0 0 900 150" preserveAspectRatio="none" role="img" aria-label="Sample SPY price rises across the trading day"><defs><linearGradient id="fill" x2="0" y2="1"><stop stopColor="#8bb2ff" stopOpacity=".35"/><stop offset="1" stopColor="#8bb2ff" stopOpacity="0"/></linearGradient></defs>{[20,60,100,140].map(y=><path key={y} d={'M0 '+y+'h900'} stroke="#ffffff24" strokeDasharray="3 6"/>)}<path id="trend" d="M0 123L36 117 51 120 89 91 105 99 133 83 160 100 191 94 226 103 249 80 280 86 312 61 335 72 370 65 397 79 426 52 449 62 476 47 516 53 543 39 573 57 607 46 631 49 665 27 699 37 726 24 750 33 788 17 815 26 842 13 872 20 900 9" fill="none" stroke="#aacaff" strokeWidth="3"/><path d="M0 123L36 117 51 120 89 91 105 99 133 83 160 100 191 94 226 103 249 80 280 86 312 61 335 72 370 65 397 79 426 52 449 62 476 47 516 53 543 39 573 57 607 46 631 49 665 27 699 37 726 24 750 33 788 17 815 26 842 13 872 20 900 9V150H0Z" fill="url(#fill)"/></svg><div className="axis"><span>9:30 AM</span><span>Noon</span><span>4 PM ET</span></div></Panel>}
export function Products(){return <section className="glass"><h2>Journal tools</h2><a href={journalHref('/review')}>Review a trade ↗</a><a href={journalHref('/learn')}>Explore lessons ↗</a><a href={journalHref('/markets')}>Explore markets ↗</a><a href={journalHref('/news')}>Read the briefing ↗</a><a href={journalHref('/about')}>Methodology and privacy ↗</a></section>}
export default function Today() {
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  return <>
    <div className="opening">
      <div className="greeting-glass">
        <time>{now.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'})}</time>
        <h1>{greeting}.</h1>
        <p>Your market journal for the day.</p>
        <Weather compact/>
      </div>
    </div>
    <div className="section-line"><h2>Market session</h2><a href={journalHref('/markets')}>Explore markets ↗</a></div>
    <MarketWidget kind="advanced-chart" symbol="AMEX:SPY"><Chart/></MarketWidget>
    <div className="section-line"><h2>Daily briefing</h2><a href={journalHref('/news')}>Read the recap ↗</a></div>
    <div className="briefing"><Briefing preview/><Weather/></div>
    <Products/>
  </>
}
