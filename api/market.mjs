import { feed } from '../server/feed.mjs'
let cached, pending
export default async function handler(req, res, env = process.env) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    return res.end()
  }
  res.setHeader('Content-Type', 'application/json')
  try {
    if (!cached || Date.now() - cached.at > 600000) {
      pending ??= feed(env)
        .then((v) => (cached = v))
        .finally(() => (pending = null))
      await pending
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300')
    res.end(JSON.stringify(cached))
  } catch {
    res.statusCode = cached ? 200 : 503
    res.end(JSON.stringify(cached ?? { error: 'Market feed unavailable' }))
  }
}
