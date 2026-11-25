import Papa from 'papaparse'
import {isoDate, num} from './review/calculations'
const defs = {
  date: /date/i,
  symbol: /symbol|ticker|instrument|security/i,
  side: /action|side|type|activity/i,
  quantity: /quantity|qty|shares|units/i,
  price: /price/i,
  fee: /^(?!.*(?:fx|conversion|exchange)).*(?:fee|commission)/i,
  fx: /currency conversion|conversion fee|fx fee|exchange fee/i,
}
export type Fields = Record<keyof typeof defs, number>
export type Sale = {
  symbol: string
  buy: string
  sell: string
  quantity: number
  entry: number
  exit: number
  fx: number
  fees: number
  net: number
  days: number
}
export const example =
  'Date,Symbol,Side,Shares,Price,Fees\n2024-01-10,MSFT,Buy,10,100,1\n2024-01-15,MSFT,Buy,5,110,1\n2024-02-15,MSFT,Sell,12,120,1\n2024-03-05,AAPL,Buy,8,140,1\n2024-03-12,AAPL,Sell,8,130,1'
export function table(text: string) {
  if (new Blob([text]).size > 2097152) throw Error('Choose a file under 2 MB.')
  const result = Papa.parse<string[]>(text.trim(), {
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', '\t', ';', '|'],
  })
  if (result.errors.some((e) => e.code === 'MissingQuotes'))
    throw Error('Check the quotation marks in your file.')
  const lines = result.data,
    i = lines.findIndex((r) => r.some((c) => defs.date.test(c)) && r.some((c) => defs.symbol.test(c)))
  const [headers, ...rows] = lines.slice(Math.max(0, i))
  if (!headers || !rows.length || rows.length > 20000)
    throw Error('Include a header and 1–20,000 activity rows.')
  const mapping = Object.fromEntries(
    Object.entries(defs).map(([k, re]) => [k, headers.findIndex((h) => re.test(h))]),
  ) as Fields
  return { headers, rows, mapping }
}
function numeric(s: string) {
  return num(s)
}
export function match(rows: string[][], map: Fields) {
  const used = Object.values(map).filter((i) => i >= 0)
  if (new Set(used).size !== used.length || Object.entries(map).some(([k, i]) => k !== 'fee' && k !== 'fx' && i < 0))
    throw Error('Choose a distinct column for each required field.')
  let skipped = 0,
    unmatched = 0
  const events = rows
    .flatMap((r) => {
      const date = isoDate(r[map.date]),
        symbol = r[map.symbol]?.trim().toUpperCase(),
        side = r[map.side]?.trim().toLowerCase(),
        qty = Math.abs(numeric(r[map.quantity])),
        price = Math.abs(numeric(r[map.price])),
        fx = r[map.fx]?.trim() ? Math.abs(numeric(r[map.fx])) : 0,
        fee = r[map.fee]?.trim() ? Math.abs(numeric(r[map.fee])) : 0
      if (
        !date ||
        !symbol ||
        !/buy|bought|purchase|reinvest|sell|sold|dispose|redemption|^[bs]$/.test(side) ||
        !Number.isFinite(qty + price + fee + fx) ||
        qty <= 0 ||
        price <= 0
      ) {
        skipped++
        return []
      }
      return [
        {
          date: date,
          symbol,
          buy: /buy|bought|purchase|reinvest|^b$/.test(side),
          qty,
          price,
          fee: fee / qty, fx: fx / qty,
        },
      ]
    })
    .sort((a, b) => a.date.localeCompare(b.date) || Number(b.buy)-Number(a.buy))
  const lots = new Map<string, typeof events>(),
    sales: Sale[] = []
  for (const e of events) {
    const queue = lots.get(e.symbol) ?? []
    lots.set(e.symbol, queue)
    if (e.buy) {
      queue.push(e)
      continue
    }
    let rest = e.qty
    while (rest > 1e-9 && queue.length) {
      const lot = queue[0],
        quantity = Math.min(rest, lot.qty),
        fx = quantity * (lot.fx + e.fx),
        fees = quantity * (lot.fee + e.fee) + fx
      sales.push({
        symbol: e.symbol,
        buy: lot.date,
        sell: e.date,
        quantity,
        entry: lot.price,
        exit: e.price,
        fees, fx,
        net: quantity * (e.price - lot.price) - fees,
        days: (Date.parse(e.date) - Date.parse(lot.date)) / 86400000,
      })
      lot.qty -= quantity
      rest -= quantity
      if (lot.qty < 1e-9) queue.shift()
    }
    unmatched += rest
  }
  return { sales, skipped, unmatched }
}
