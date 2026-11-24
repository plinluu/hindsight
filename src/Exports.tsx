import { useState } from 'react'
import Papa from 'papaparse'
import type { Sale } from './trades'
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export default function Exports({ sales }: { sales: Sale[] }) {
  const [hideTick, tick] = useState(false),
    [hideAmt, amt] = useState(false),
    [error, msg] = useState('')
  function png() {
    const canvas = document.createElement('canvas')
    canvas.width = 1000
    canvas.height = 180 + sales.length * 24
    if (canvas.height > 32000) {
      msg('This report exceeds the image size limit. Download the complete CSV.')
      return
    }
    const c = canvas.getContext('2d')
    if (!c) return
    c.fillStyle = '#fff9ef'
    c.fillRect(0, 0, 1000, canvas.height)
    c.fillStyle = '#263e37'
    c.font = '32px Georgia'
    c.fillText('Hindsight · Trade review', 32, 48)
    c.font = '18px sans-serif'
    c.fillText(
      hideAmt
        ? sales.length + ' matched lots'
        : 'Net ' +
            sales.reduce((n, s) => n + s.net, 0).toFixed(2) +
            ' · Fees ' +
            sales.reduce((n, s) => n + s.fees, 0).toFixed(2),
      32,
      80,
    )
    sales.forEach((s, i) =>
      c.fillText(
        [
          hideTick ? 'Trade ' + (i + 1) : s.symbol,
          s.buy + ' to ' + s.sell,
          hideAmt ? '' : 'Net ' + s.net.toFixed(2),
        ].join('   '),
        32,
        116 + i * 24,
      ),
    )
    c.fillText('Educational trade review', 32, canvas.height - 20)
    canvas.toBlob((b) => {
      if (b) download(b, 'hindsight-review.png')
      else msg('Image export unavailable.')
    })
  }
  return (
    <details>
      <summary>Export results</summary>
      <p>Choose what appears on the image.</p>
      <label>
        <span>
          <input type="checkbox" checked={hideTick} onChange={(e) => tick(e.target.checked)} /> Hide symbols
        </span>
      </label>
      <label>
        <span>
          <input type="checkbox" checked={hideAmt} onChange={(e) => amt(e.target.checked)} /> Hide amounts
        </span>
      </label>
      <div className="row">
        <button onClick={png}>Download PNG</button>
        <button
          onClick={() =>
            download(
              new Blob([Papa.unparse(sales, { escapeFormulae: true })], { type: 'text/csv' }),
              'hindsight-review.csv',
            )
          }
        >
          Download full CSV
        </button>
      </div>
      <p role="status">{error}</p>
    </details>
  )
}
