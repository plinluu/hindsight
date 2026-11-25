import SaleChart from './SaleChart'
import type { Sale } from './trades'
import Exports from './Exports'
export function Line({ points }: { points: number[] }) {
  const min = Math.min(...points),
    max = Math.max(...points)
  return (
    <svg
      role="img"
      aria-label={'Values in order: ' + points.map((v) => v.toFixed(2)).join(', ')}
      viewBox="0 0 500 96"
      width="100%"
      height="96"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        points={points
          .map(
            (v, i) =>
              8 +
              (i * 484) / Math.max(1, points.length - 1) +
              ',' +
              (84 - (72 * (v - min)) / (max - min || 1)),
          )
          .join(' ')}
      />
    </svg>
  )
}
export default function Results({ sales }: { sales: Sale[] }) {
  if (!sales.length)
    return <p>No sales matched earlier purchases. Include the earlier purchases in your export.</p>
  const sum = (f: (r: Sale) => number) => sales.reduce((n, v) => n + f(v), 0),
    wins = sales.filter((r) => r.net > 0),
    losses = sales.filter((r) => r.net < 0),
    average = (rows: Sale[]) =>
      rows.length ? (rows.reduce((a, r) => a + r.days, 0) / rows.length).toFixed(1) : '—'
  const lossDates = new Set(losses.map((r) => r.sell))
  let running = 0
  return (
    <>
      <SaleChart sales={sales}/>
      <section className="panel">
        <h2>Your completed trades</h2>
        <dl className="sale-totals">{[
          ['Profit after fees',sum(r=>r.net).toFixed(2)],
          ['Broker fees',sum(r=>r.fees).toFixed(2)],
          ['Profitable lots',wins.length+' of '+sales.length],
          ['Average time held',average(sales)+' days'],
        ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <details><summary>Results and fees by lot</summary>
        <p>Each lot pairs shares sold with their earliest matching purchase. Amounts use the currency of your file.</p>
        {sales.map((r,i)=><p key={i}>{r.symbol} · {r.sell} · {r.quantity} shares · Fees {r.fees.toFixed(2)} · Net {r.net.toFixed(2)}</p>)}
      </details>
      <details>
        <summary>Cumulative result</summary>
        <Line points={[0, ...sales.map((r) => (running += r.net))]} />
      </details>
      <details>
        <summary>Trading habits</summary>
        <p>
          Holding periods · Winning lots averaged {average(wins)} days. Losing lots averaged {average(losses)}{' '}
          days.
        </p>
        <p>
          Quick re-entry ·{' '}
          {
            sales.filter((r) => {
              const buy = Date.parse(r.buy)
              return [1, 2, 3, 4, 5].some((days) =>
                lossDates.has(new Date(buy - days * 86400000).toISOString().slice(0, 10)),
              )
            }).length
          }{' '}
          matched lots opened within five days of a losing sale.
        </p>

      </details>
      <Exports sales={sales} />
    </>
  )
}
