import { useState } from 'react'
import { table, match, example, type Fields } from '../trades'
import Results from '../ReviewResults'
import { useValue, save } from '../data'
const brokers = [
  'questrade.com',
  'wealthsimple.com',
  'interactivebrokers.com',
  'robinhood.com',
  'fidelity.com',
  'schwab.com',
  'webull.com',
  'etrade.com',
]
export default function Review() {
  const terms = useValue('terms'),
    [raw, set] = useState(''),
    [parsed, parse] = useState<ReturnType<typeof table>>(),
    [report, show] = useState<ReturnType<typeof match>>(),
    [note, msg] = useState(''),
    [demo, mark] = useState(false)
  function reset(text: string) {
    set(text)
    parse(undefined)
    show(undefined)
    msg('')
    mark(false)
  }
  function inspect(text: string, sample = false) {
    try {
      const t = table(text)
      parse(t)
      msg('')
      mark(sample)
      show(sample ? match(t.rows, t.mapping) : undefined)
    } catch (e) {
      msg((e as Error).message)
    }
  }
  return (
    <>
      <h1>Trade review</h1>
      {terms !== 'v1' ? (
        <section className="panel">
          <h2>Before reviewing trades</h2>
          <p>
            Hindsight uses historical prices to illustrate past decisions. Results are estimates for learning.
            You choose whether to request price history for a symbol.
          </p>
          <a href="#/About">Read terms and privacy</a>
          <div className="row">
            <button onClick={() => save('terms', 'v1')}>Accept and continue</button>
            <a href="#/Declined">Decline</a>
          </div>
        </section>
      ) : (
        <>
          <section className="panel stack">
            <h2>Import your activity</h2>
            <p>
              Choose a broker export in one currency or paste a table. Trades stay in this tab. Include
              purchases that preceded your first sale.
            </p>
            <details>
              <summary>Find your broker export</summary>
              <p>Open activity or statements, select the date range, and download trade activity as CSV.</p>
              <div className="row">
                {brokers.map((b) => (
                  <a key={b} href={'https://www.' + b} rel="noreferrer" target="_blank">
                    {b.split('.')[0]}
                  </a>
                ))}
              </div>
            </details>
            <label>
              CSV, TSV or text file
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  if (f.size > 2097152) {
                    msg('Choose a file under 2 MB.')
                    return
                  }
                  try {
                    const t = await f.text()
                    reset(t)
                    inspect(t)
                  } catch {
                    msg('File could not be read.')
                  }
                }}
              />
            </label>
            <label>
              Paste trade activity
              <textarea rows={4} value={raw} onChange={(e) => reset(e.target.value)} />
            </label>
            <div className="row">
              <button disabled={!raw.trim()} onClick={() => inspect(raw)}>
                Match columns
              </button>
              <button
                onClick={() => {
                  reset(example)
                  inspect(example, true)
                }}
              >
                Try example trades
              </button>
            </div>
          </section>
          {parsed && (
            <section className="panel">
              <h2>Column mapping</h2>
              <div className="grid2">
                {(Object.keys(parsed.mapping) as (keyof Fields)[]).map((k) => (
                  <label key={k}>
                    {k}
                    {k === 'fee' ? ' (optional)' : ''}
                    <select
                      value={parsed.mapping[k]}
                      onChange={(e) => {
                        parse({ ...parsed, mapping: { ...parsed.mapping, [k]: Number(e.target.value) } })
                        show(undefined)
                      }}
                    >
                      <option value={-1}>Select column</option>
                      {parsed.headers.map((v, i) => (
                        <option key={i} value={i}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button
                onClick={() => {
                  try {
                    show(match(parsed.rows, parsed.mapping))
                    msg('')
                  } catch (e) {
                    msg((e as Error).message)
                  }
                }}
              >
                Review matched sales
              </button>
            </section>
          )}
          <p role="status">{note}</p>
          {report && (
            <>
              <p>
                {demo ? 'Example data · ' : ''}
                {report.sales.length} matched lots · {report.skipped} skipped rows · {report.unmatched}{' '}
                unmatched shares sold
              </p>
              <Results sales={report.sales} />
            </>
          )}
        </>
      )}
    </>
  )
}
