import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authRouter } from './routes/auth.js'
import { documentsRouter } from './routes/documents.js'
import { shareRouter } from './routes/share.js'
import { runMigrations } from './db/index.js'
import { startCollabServer } from './ws/collab.js'

// ─── Bootstrap DB ───────────────────────────────────────────────────────────────
runMigrations()

const app = new Hono()

// ─── Global middleware ───────────────────────────────────────────────────────────
app.use('*', logger())
app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.route('/auth', authRouter)
app.route('/documents', documentsRouter)
app.route('/share', shareRouter)

// Health check
app.get('/health', (c) => c.json({ ok: true, version: '0.1.0' }))

// ─── HTTP Server ───────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '3001')
serve({ fetch: app.fetch, port }, () => {
  console.log(`[server] HTTP API running on http://localhost:${port}`)
})

// ─── WebSocket Collab Server ─────────────────────────────────────────────────────────
const wsPort = parseInt(process.env.WS_PORT ?? '3002')
startCollabServer(wsPort)
