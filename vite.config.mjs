import briefing from './api/finnhub/briefing.mjs'
import security from './api/security.mjs'
import history from './api/history.mjs'
import { defineConfig, loadEnv } from 'vite'
import market from './api/market.mjs'
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  const api = (s) => {
    s.middlewares.use('/api/finnhub/briefing', (req, res) => briefing(req, res, env))
    s.middlewares.use("/api/security", security)
    s.middlewares.use('/api/market', (req, res) => market(req, res, env))
    s.middlewares.use('/api/history', (req, res) => history(req, res, env))
  }
  return {
    base: './',
    plugins: [
      {
        name: 'local-market-api',
        configureServer(s) {
          api(s)
        },
        configurePreviewServer(s) {
          api(s)
        },
      },
    ],
  }
})
