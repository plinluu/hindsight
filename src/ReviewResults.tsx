import { useState } from 'react'
import { json } from './data'
import type { Sale } from './trades'
import Exports from './Exports'
type Point = { date: string; close: number }
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
  const [index, select] = useState(0),
    [days, horizon] = useState('30'),
    [history, setHistory] = useState<Record<string, Point[]>>({}),
    [status, msg] = useState('')
  if (!sales.length)
    return <p>No sales matched earlier purchases. Include the earlier purchases in your export.</p>
  const s = sales[index],
    sum = (f: (r: Sale) => number) => sales.reduce((n, v) => n + f(v), 0),
    wins = sales.filter((r) => r.net > 0),
    losses = sales.filter((r) => r.net < 0),
    average = (rows: Sale[]) =>
      rows.length ? (rows.reduce((a, r) => a + r.days, 0) / rows.length).toFixed(1) : '—'
  function after(r: Sale) {
    const target = days === 'today' ? Date.now() : Date.parse(r.sell) + Number(days) * 86400000
    return target <= Date.now()
      ? history[r.symbol]?.filter((p) => p.date >= r.sell && Date.parse(p.date) <= target).at(-1)
      : undefined
  }
  const end = after(s),
    ordered = sales
      .map((r) => ({ r, miss: after(r) ? (after(r)!.close - r.exit) * r.quantity : null }))
      .sort((a, b) => (b.miss ?? -Infinity) - (a.miss ?? -Infinity))
  const chases = sales.filter((r) => {
    const pts = history[r.symbol]?.filter((p) => p.date < r.buy).slice(-5)
    return pts?.length === 5 && pts[4].close > pts[0].close
  })
  const lossDates = new Set(losses.map((r) => r.sell))
  let running = 0
  return (
    <>
      <section className="panel stack">
        <h2>Your results</h2>
        <p>
          Net after fees <strong>{sum((r) => r.net).toFixed(2)}</strong> · Fees{' '}
          {sum((r) => r.fees).toFixed(2)} · Profitable lots {((100 * wins.length) / sales.length).toFixed(0)}%
          · Average hold {average(sales)} days
        </p>
        <label>
          Matched sale
          <select value={index} onChange={(e) => select(Number(e.target.value))}>
            {sales.map((r, i) => (
              <option key={i} value={i}>
                {r.symbol} · {r.sell} · {r.quantity} shares from {r.buy}
              </option>
            ))}
          </select>
        </label>
        <label>
          Compare through
          <select value={days} onChange={(e) => horizon(e.target.value)}>
            <option value="30">30 days later</option>
            <option value="90">90 days later</option>
            <option value="today">Today</option>
          </select>
        </label>
        <Line points={[s.entry, s.exit, ...(end ? [end.close] : [])]} />
        <p>
          Buy {s.entry} · Sale {s.exit} ·{' '}
          {end ? 'Weekly close ' + end.close + ' on ' + end.date : 'Later close unavailable'}
        </p>
        <button
          onClick={async () => {
            msg('Loading weekly closes…')
            try {
              const points = await json('api/history?symbol=' + encodeURIComponent(s.symbol))
              if (!Array.isArray(points)) throw Error()
              setHistory((h) => ({ ...h, [s.symbol]: points }))
              msg('Weekly closes loaded.')
            } catch {
              msg('History unavailable. Check the server key or retry later.')
            }
          }}
        >
          Load history for {s.symbol}
        </button>
        <small role="status">{status}</small>
      </section>
      <details>
        <summary>Missed upside and fees by lot</summary>
        <p>
          Difference between proceeds at sale and at the last weekly close through the selected horizon.
          Amounts use the currency of your file.
        </p>
        {ordered.map(({ r, miss }, i) => (
          <p key={i}>
            {r.symbol} · {r.sell} · Difference {miss?.toFixed(2) ?? 'unavailable'} · Fees {r.fees.toFixed(2)}{' '}
            · Net {r.net.toFixed(2)}
          </p>
        ))}
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
        <p>
          Momentum ·{' '}
          {Object.keys(history).length
            ? chases.length + ' matched lots bought after a four-week rise, among loaded histories.'
            : 'Load weekly history to check for purchases after a rise.'}
        </p>
      </details>
      <Exports sales={ordered.map((o) => o.r)} />
    </>
  )
}
