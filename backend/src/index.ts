import 'dotenv/config'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { readFile, existsSync } from 'node:fs'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { authRouter } from './routes/auth.js'
import { documentsRouter } from './routes/documents.js'
import { shareRouter } from './routes/share.js'
import { runMigrations } from './db/index.js'
import { ensureJwtSecret } from './lib/secret.js'
import { attachCollabServer } from './ws/collab.js'

const readFileAsync = promisify(readFile)

// ─── Bootstrap ──────────────────────────────────────────────────────────────
ensureJwtSecret()
runMigrations()

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
// In production we ship: /app/backend/dist/index.js and /app/frontend/dist/...
// In dev (tsx watch) we run /backend/src/index.ts and frontend dev is on 5173.
const PROD_WEB_DIR = resolve(__dirname, '../../frontend/dist')
const SERVE_STATIC = existsSync(PROD_WEB_DIR)

const app = new Hono()

app.use('*', logger())

// CORS only matters in dev (Vite proxy strips it in prod). Stay permissive for dev.
app.use('/auth/*', cors())
app.use('/documents/*', cors())
app.use('/share/*', cors())

// ─── API routes ─────────────────────────────────────────────────────────────
app.route('/auth', authRouter)
app.route('/documents', documentsRouter)
app.route('/share', shareRouter)

app.get('/health', (c) => c.json({ ok: true, version: '0.2.0', mode: SERVE_STATIC ? 'standalone' : 'dev' }))

// ─── Static frontend (production) ──────────────────────────────────────────
if (SERVE_STATIC) {
  // 1. Real static assets
  app.use('/assets/*', serveStatic({ root: PROD_WEB_DIR, rewriteRequestPath: (p) => p }))
  app.get('/favicon.svg', serveStatic({ path: join(PROD_WEB_DIR, 'favicon.svg') }))
  app.get('/favicon.ico', serveStatic({ path: join(PROD_WEB_DIR, 'favicon.ico') }))

  // 2. SPA fallback — every non-API GET returns index.html
  app.get('*', async (c) => {
    // Skip API paths (they're matched above already, but defensive)
    const p = c.req.path
    if (p.startsWith('/auth') || p.startsWith('/documents') || p.startsWith('/share') ||
        p.startsWith('/health') || p.startsWith('/ws')) {
      return c.notFound()
    }
    try {
      const html = await readFileAsync(join(PROD_WEB_DIR, 'index.html'), 'utf-8')
      return c.html(html)
    } catch {
      return c.text('Frontend build not found. Run `pnpm --filter frontend build`.', 500)
    }
  })
}

// ─── Server bootstrap (HTTP + WS on the SAME port) ─────────────────────────
const port = parseInt(process.env.PORT ?? '3000')

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[flowmind] listening on http://localhost:${info.port}  mode=${SERVE_STATIC ? 'standalone' : 'dev'}`)
})

// Attach Yjs WebSocket server to the same HTTP server
attachCollabServer(server as any)
