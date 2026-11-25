import Parser from 'rss-parser'
import { normalizeStories } from './feed.mjs'

const parser = new Parser({ customFields: { item: ['source'] } })
const wireSearch = 'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q='
const feeds = [
  ['BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml', 'Business'],
  ['The Guardian', 'https://www.theguardian.com/business/rss', 'Business'],
  ['CNBC', 'https://www.cnbc.com/id/100003114/device/rss/rss.html', 'Markets'],
  ['NPR', 'https://feeds.npr.org/1017/rss.xml', 'Economy'],
  ['BBC News', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'World'],
  ['The Guardian', 'https://www.theguardian.com/world/rss', 'World'],
  ['Google News', wireSearch + encodeURIComponent('(tariffs OR sanctions OR "central bank" OR "oil supply" OR "shipping disruption" OR "crop losses") when:3d'), 'Search'],
]
const topics = [
  ['Energy', /\b(oil|opec|natural gas|pipeline|refinery|electricity|fuel prices)\b/i, 'Energy costs affect household bills and the cost of producing and shipping goods.'],
  ['Trade', /\b(tariffs?|sanctions?|exports?|imports?|trade deal|trade war|shipping|supply chains?|ports?)\b/i, 'Changes in cross-border trade can affect prices and which companies can reach customers.'],
  ['Economy', /\b(inflation|interest rates?|central banks?|federal reserve|fed|jobs report|unemployment|gdp|recession)\b/i, 'Changes in growth, jobs and borrowing costs can influence what people and businesses spend.'],
  ['World affairs', /\b(war|conflict|invasion|ceasefire|airstrikes?|blockade|elections?|budget bill)\b/i, 'Political shifts and conflict can change trade routes, government spending and business plans.'],
  ['Climate & supply', /\b(drought|hurricane|floods?|crop losses|earthquake|wildfires?)\b/i, 'Extreme weather and disasters can disrupt production, transport and insurance.'],
  ['Technology', /\b(artificial intelligence|chipmakers?|semiconductors?|data cent(?:er|re)s?|cyberattack)\b/i, 'Changes in technology can shift costs and demand across industries.'],
  ['Earnings', /\b(earnings|profits?|revenue|quarterly sales)\b/i, 'Sales and profits show how a business is doing and can change what investors expect.'],
]
const cache = new Map()
let pending
async function readFeed([publisher, url, section]) {
  const prior = cache.get(url)
  if (prior && Date.now() - prior.at < 300000) return prior.items
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5500) })
    if (!response.ok) throw Error()
    const { items } = await parser.parseString(await response.text())
    const stories = items.flatMap(item => {
      const time = Date.parse(item.isoDate || item.pubDate)
      if (!item.title || !item.link || !Number.isFinite(time) || time < Date.now() - 7 * 86400000) return []
      let link
      try { link = new URL(item.link) } catch { return [] }
      if (!['https:', 'http:'].includes(link.protocol)) return []
      const source = section === 'Search' ? (item.source?._ || (typeof item.source === 'string' && item.source)) : publisher
      if (!source) return []
      const suffix = ' - ' + source
      const headline = section === 'Search' && item.title.endsWith(suffix) ? item.title.slice(0, -suffix.length) : item.title
      const topic = topics.find(([, pattern]) => pattern.test(headline))
      if (!topic && section === 'World') return []
      return [{headline, source, url: link.href, datetime: time / 1000, topic, section}]
    }).slice(0, 16)
    if (!stories.length) throw Error()
    cache.set(url, { items: stories, at: Date.now() })
    return stories
  } catch {
    return prior && Date.now() - prior.at < 3600000 ? prior.items : []
  }
}
export async function marketNews() {
  pending ??= Promise.all(feeds.map(readFeed)).then(groups => {
    const raw = groups.flat()
    const byUrl = new Map(raw.map(item => [item.url, item]))
    return normalizeStories(raw).map(story => {
      const item = byUrl.get(story.url)
      const topic = item?.topic
      const category = topic?.[0] ?? (item?.section === 'Search' ? 'Markets' : item?.section) ?? story.category
      return { ...story, category, why: topic?.[2] ?? story.why }
    })
  }).finally(() => { pending = undefined })
  return pending
}
