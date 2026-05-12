import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { documents } from '../db/schema.js'
import { verifyToken } from './auth.js'
import type { Document } from '@flowmind/shared'

const requireAuth = async (c: any, next: () => Promise<void>) => {
  const token = (c.req.header('Authorization') ?? '').replace('Bearer ', '')
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  try {
    c.set('userId', await verifyToken(token))
    await next()
  } catch {
    return c.json({ ok: false, error: 'Invalid token' }, 401)
  }
}

function nanoid(len = 21): string {
  const crypto = require('node:crypto')
  return crypto.randomBytes(len).toString('base64url').slice(0, len)
}

function toApiDoc(row: typeof documents.$inferSelect): Document {
  return {
    id: row.id, title: row.title, content: row.content,
    ownerId: row.ownerId, isPublic: Boolean(row.isPublic),
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  }
}

export const documentsRouter = new Hono()
documentsRouter.use('*', requireAuth)

const createSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  isPublic: z.boolean().optional(),
})

// GET /documents
documentsRouter.get('/', async (c) => {
  const userId = c.get('userId') as string
  const rows = db.select().from(documents)
    .where(eq(documents.ownerId, userId))
    .orderBy(desc(documents.updatedAt)).all()
  return c.json({ ok: true, data: rows.map(toApiDoc) })
})

// POST /documents
documentsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const userId = c.get('userId') as string
  const body = c.req.valid('json')
  const now = new Date().toISOString()
  const id = nanoid()
  db.insert(documents).values({
    id, title: body.title ?? 'Untitled', content: body.content ?? '{}',
    ownerId: userId, isPublic: false, createdAt: now, updatedAt: now,
  }).run()
  const row = db.select().from(documents).where(eq(documents.id, id)).get()!
  return c.json({ ok: true, data: toApiDoc(row) }, 201)
})

// GET /documents/:id
documentsRouter.get('/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const row = db.select().from(documents).where(eq(documents.id, id)).get()
  if (!row) return c.json({ ok: false, error: 'Not found' }, 404)
  if (row.ownerId !== userId && !row.isPublic)
    return c.json({ ok: false, error: 'Forbidden' }, 403)
  return c.json({ ok: true, data: toApiDoc(row) })
})

// PATCH /documents/:id
documentsRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const row = db.select().from(documents).where(eq(documents.id, id)).get()
  if (!row) return c.json({ ok: false, error: 'Not found' }, 404)
  if (row.ownerId !== userId) return c.json({ ok: false, error: 'Forbidden' }, 403)
  const now = new Date().toISOString()
  db.update(documents).set({
    ...(body.title !== undefined && { title: body.title }),
    ...(body.content !== undefined && { content: body.content }),
    ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
    updatedAt: now,
  }).where(eq(documents.id, id)).run()
  const updated = db.select().from(documents).where(eq(documents.id, id)).get()!
  return c.json({ ok: true, data: toApiDoc(updated) })
})

// DELETE /documents/:id
documentsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const row = db.select().from(documents).where(eq(documents.id, id)).get()
  if (!row) return c.json({ ok: false, error: 'Not found' }, 404)
  if (row.ownerId !== userId) return c.json({ ok: false, error: 'Forbidden' }, 403)
  db.delete(documents).where(eq(documents.id, id)).run()
  return c.json({ ok: true })
})
