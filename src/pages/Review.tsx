import { useEffect, useRef, useState } from 'react'
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
let tabReport:ReturnType<typeof match> | undefined
export default function Review({aboutHref = '#/About', declineHref = '#/Declined'}: {aboutHref?: string; declineHref?: string}) {
  const terms = useValue('terms'),
    [raw, set] = useState(''),
    [parsed, parse] = useState<ReturnType<typeof table>>(),
    [report, show] = useState(tabReport),
    [note, msg] = useState('')
  const [importing, setImporting] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    tabReport=report
    if (report?.sales.length) {
      setImporting(false)
      heading.current?.focus({preventScroll:true})
      heading.current?.scrollIntoView({block:'center'})
    }
  }, [report])
  function reset(text: string) {
    set(text)
    parse(undefined)
    show(undefined)
    msg('')
  }
  function inspect(text: string) {
    try {
      const t = table(text)
      parse(t)
      msg(t.rows.length+' activity rows found. Check the column matches below.')
    } catch (e) {
      msg((e as Error).message)
    }
  }
  async function readFile(file?:File) {
    if(!file)return
    if(file.size>2097152){msg('Choose a file under 2 MB.');return}
    if(!/\.(csv|tsv|txt)$/i.test(file.name) && !/^text\//.test(file.type)){msg('Choose a plain text broker export.');return}
    try{const text=await file.text();reset(text);inspect(text)}catch{msg('File could not be read.')}
  }
  return (
    <>
      <h1 ref={heading} tabIndex={-1}>Trade review</h1>
      <div className="review-actions"><button aria-expanded={importing} onClick={()=>setImporting(!importing)}>{importing?'Close import':'Import my trades'}</button>
        {!!report?.sales.length && <button onClick={()=>{reset('');setImporting(false)}}>Back to demo</button>}</div>
      {report && <p role="status">{report.sales.length} matched lots · {report.skipped} skipped rows · {report.unmatched} unmatched shares sold</p>}
      {report && !report.sales.length && <p>Include the purchases that came before your sales in the export.</p>}
      {importing && (terms !== 'v1' ? (
        <section className="panel">
          <h2>Before reviewing trades</h2>
          <p>
            Hindsight uses historical prices to illustrate past decisions. Results are estimates for learning.
            Open TradingView when you want to compare a sale with the market.
          </p>
          <a href={aboutHref}>Read terms and privacy</a>
          <div className="row">
            <button onClick={() => save('terms', 'v1')}>Accept and continue</button>
            <a href={declineHref}>Decline</a>
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
            <label className="review-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void readFile(e.dataTransfer.files[0])}}>
              Choose or drop a CSV, TSV or text file
              <input type="file" accept=".csv,.tsv,.txt" onChange={e=>void readFile(e.target.files?.[0])}/>
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
                  inspect(example)
                }}
              >
                Try a sample import
              </button>
            </div>
          </section>
          {parsed && (
            <section className="panel">
              <h2>Column mapping</h2>
              <div className="grid2">
                {(Object.keys(parsed.mapping) as (keyof Fields)[]).map((k) => (
                  <label key={k}>
                    {{fee:'Commission',fx:'Currency conversion',side:'Buy or sell',price:'Price per share',quantity:'Shares',symbol:'Ticker',date:'Trade date'}[k]}
                    {k === 'fee' || k === 'fx' ? ' (optional)' : ''}
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

        </>
      ))}
      <Results key={report?.sales.length ? 'imported' : 'demo'} sales={report?.sales.length ? report.sales : undefined}/>
    </>
  )
}
