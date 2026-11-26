import { useState } from 'react'
import { Line } from './LearnLine'
const lessons = [
  [
    'Earnings',
    'A company can make money and still fall if investors expected a higher profit.',
    [100, 101, 101, 92, 94],
  ],
  [
    'Outlook',
    'A change in expected future sales can affect the price before those sales happen.',
    [100, 102, 101, 110, 111],
  ],
  [
    'Interest rates',
    'Higher borrowing costs can reduce what investors will pay for future earnings.',
    [100, 99, 96, 95, 94],
  ],
  [
    'Sector rotation',
    'Investors can move money between industries as their expectations change.',
    [100, 99, 101, 104, 108],
  ],
  [
    'Large orders',
    'A large order can move through several price levels when few shares are offered.',
    [100, 100, 101, 108, 104],
  ],
  [
    'Headlines',
    'An unconfirmed report can move a price quickly. A correction can reverse that move.',
    [100, 101, 110, 102, 100],
  ],
  [
    'Market mood',
    'A shift in confidence can move many stocks together, even when a single company has no news.',
    [100, 96, 103, 97, 105],
  ],
] as const
export default function Learn() {
  const [n, set] = useState(0),
    [name, desc, points] = lessons[n]
  return (
    <>
      <h1>Why prices move</h1>
      <section className="glass lesson-panel stack">
        <label>
          Choose a lesson
          <select className="glass-inset" value={n} onChange={(e) => set(+e.target.value)}>
            {lessons.map(([s], i) => (
              <option value={i} key={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <h2>{name}</h2>
        <p>{desc}</p>
        <Line points={[...points]} />
        <small>Illustrative prices · simulated example</small>
      </section>
    </>
  )
}
