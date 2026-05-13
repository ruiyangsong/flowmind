import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { db } from '../db/index.js'
import { documents, shareTokens } from '../db/schema.js'
import { verifyToken } from './auth.js'

function nanoid(len = 32): string {
  return randomBytes(len).toString('base64url').slice(0, len)
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function parseExpiry(s: string): string | null {
  if (s === 'never') return null
  const days = s.endsWith('d') ? parseInt(s) : null
  if (!days) return null
  return addDays(days)
}

const requireAuth = async (c: any, next: () => Promise<void>) => {
  const token = (c.req.header('Authorization') ?? '').replace('Bearer ', '')
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  try {
    (c as any).set('userId', await verifyToken(token))
    await next()
  } catch {
    return c.json({ ok: false, error: 'Invalid token' }, 401)
  }
}

export const shareRouter = new Hono()

const createShareSchema = z.object({
  mode: z.enum(['readonly', 'collab']),
  expiresIn: z.string().optional().default('30d'), // e.g. '7d', '30d', 'never'
})

// POST /share/:docId  — create share token
shareRouter.post('/:docId', requireAuth, zValidator('json', createShareSchema), async (c) => {
  const userId = (c as any).get('userId') as string
  const docId = c.req.param('docId')
  const { mode, expiresIn } = c.req.valid('json')

  const doc = db.select().from(documents).where(eq(documents.id, docId)).get()
  if (!doc) return c.json({ ok: false, error: 'Document not found' }, 404)
  if (doc.ownerId !== userId) return c.json({ ok: false, error: 'Forbidden' }, 403)

  const token = nanoid()
  const now = new Date().toISOString()
  const expiresAt = parseExpiry(expiresIn)

  db.insert(shareTokens).values({
    token, documentId: docId, mode,
    createdBy: userId, expiresAt: expiresAt ?? undefined, createdAt: now,
  }).run()

  // In standalone deployment frontend & backend share the same origin —
  // emit a relative path so the URL works no matter where the user accesses it.
  // Optional FRONTEND_URL override is still honoured (e.g. behind a reverse proxy).
  const baseUrl = process.env.FRONTEND_URL ?? ''
  const shareUrl = mode === 'readonly'
    ? `${baseUrl}/share/${token}`
    : `${baseUrl}/collab/${token}`

  return c.json({ ok: true, data: { token, mode, shareUrl, expiresAt } }, 201)
})

// GET /share/:docId  — list tokens for a document
shareRouter.get('/:docId', requireAuth, async (c) => {
  const userId = (c as any).get('userId') as string
  const docId = c.req.param('docId')

  const doc = db.select().from(documents).where(eq(documents.id, docId)).get()
  if (!doc) return c.json({ ok: false, error: 'Not found' }, 404)
  if (doc.ownerId !== userId) return c.json({ ok: false, error: 'Forbidden' }, 403)

  const tokens = db.select().from(shareTokens)
    .where(eq(shareTokens.documentId, docId)).all()
  return c.json({ ok: true, data: tokens })
})

// DELETE /share/token/:token  — revoke a share token
shareRouter.delete('/token/:token', requireAuth, async (c) => {
  const userId = (c as any).get('userId') as string
  const token = c.req.param('token')

  const row = db.select().from(shareTokens).where(eq(shareTokens.token, token)).get()
  if (!row) return c.json({ ok: false, error: 'Not found' }, 404)

  // Verify ownership via document
  const doc = db.select().from(documents).where(eq(documents.id, row.documentId)).get()
  if (!doc || doc.ownerId !== userId) return c.json({ ok: false, error: 'Forbidden' }, 403)

  db.delete(shareTokens).where(eq(shareTokens.token, token)).run()
  return c.json({ ok: true })
})

// GET /share/resolve/:token  — public endpoint: validate token & return doc metadata
shareRouter.get('/resolve/:token', async (c) => {
  const token = c.req.param('token')
  const row = db.select().from(shareTokens).where(eq(shareTokens.token, token)).get()
  if (!row) return c.json({ ok: false, error: 'Invalid or expired link' }, 404)

  // Check expiry
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    return c.json({ ok: false, error: 'Link has expired' }, 410)
  }

  const doc = db.select().from(documents).where(eq(documents.id, row.documentId)).get()
  if (!doc) return c.json({ ok: false, error: 'Document not found' }, 404)

  return c.json({
    ok: true,
    data: {
      documentId: doc.id,
      title: doc.title,
      content: doc.content,
      mode: row.mode,
      expiresAt: row.expiresAt,
    },
  })
})
