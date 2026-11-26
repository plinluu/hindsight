const cleanUrl = (url) => {
  try {
    const u = new URL(url)
    return ['https:', 'http:'].includes(u.protocol) ? u.href : null
  } catch {
    return null
  }
}
const explain = {
  forex: 'Currency moves change the local cost of imports and overseas sales.',
  crypto: 'Changes in crypto demand can affect prices across digital assets.',
  merger: 'A deal can change how investors value both companies.',
  general: 'This report gives context for the market moves in your recap.',
}
export function normalizeStories(items) {
  const seen = new Set()
  return (Array.isArray(items) ? items : [])
    .filter((n) => {
      const url = cleanUrl(n.url),
        id = n.headline?.trim().toLowerCase()
      if (!id || !url || !n.datetime || seen.has(id) || seen.has(url)) return false
      seen.add(id)
      seen.add(url)
      return true
    })
    .sort((a,b) => b.datetime - a.datetime)
    .slice(0, 60)
    .map((n) => {
      const h = n.headline.toLowerCase(),
        category = /earnings|revenue|profit/.test(h)
          ? 'Earnings'
          : /rate cut|inflation|fed\b|tariff/.test(h)
            ? 'Economy'
            : /acqui|merger/.test(h)
              ? 'Deals'
              : 'Markets'
      return {
        headline: n.headline,
        url: cleanUrl(n.url),
        source: n.source || 'Finnhub',
        time: n.datetime,
        category,
        tone: /\b(slumps?|falls?|drops?|losses)\b/.test(h)
          ? 'Negative'
          : /\b(rallies|rises?|gains?|surges?)\b/.test(h)
            ? 'Positive'
            : 'Neutral',
        why:
          category === 'Earnings'
            ? 'Reported profits help investors reassess what a company could earn.'
            : category === 'Economy'
              ? 'Economic policy can change borrowing costs and demand.'
              : category === 'Deals'
                ? explain.merger
                : (explain[n.category] ?? explain.general),
      }
    })
}
