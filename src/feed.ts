import { useEffect, useState } from 'react'
import { json, read, save } from './data'
export type Story = {
  headline: string
  url: string
  source: string
  time: number
  category: string
  tone: string
  why: string
}
type Price = { symbol: string; name: string; group: string; price: number; change: number; time: number }
type Feed = {
  events?: { symbol: string; date: string }[]
  at: number
  stories: Story[]
  prices: Price[]
  recap: string
}
function cached(): Feed | null {
  try {
    return JSON.parse(read('feed') ?? 'null')
  } catch {
    return null
  }
}
export function useFeed() {
  const [data, set] = useState(cached),
    [error, fail] = useState(false)
  useEffect(() => {
    let live = true,
      timer: ReturnType<typeof setTimeout>,
      delay = 15000
    async function refresh() {
      try {
        let v = cached()
        if (!v || Date.now() - v.at >= 600000) {
          v = (await json(import.meta.env.BASE_URL + 'api/market')) as Feed
          if (!Array.isArray(v.stories) || !Array.isArray(v.prices)) throw Error()
          save('feed', JSON.stringify(v))
        }
        if (live) {
          set(v)
          fail(false)
        }
        delay = Math.max(15000, 600000 - (Date.now() - v.at))
      } catch {
        if (live) fail(true)
        delay = Math.min(delay * 2, 600000)
      } finally {
        if (live) timer = setTimeout(refresh, delay)
      }
    }
    void refresh()
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [])
  return { data, error }
}
