import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'
import { db } from '../db/index.js'
import { uploads } from '../db/schema.js'
import { verifyToken } from './auth.js'
import { getStorage, makeStorageKey, maxUploadSize } from '../lib/storage.js'

// ─── auth middleware (same shape as documents.ts) ──────────────────────────
const requireAuth = async (c: any, next: () => Promise<void>) => {
  const token = (c.req.header('Authorization') ?? '').replace('Bearer ', '')
  if (!token) return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, 401)
  try {
    (c as any).set('userId', await verifyToken(token))
    await next()
  } catch {
    return c.json({ ok: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token' } }, 401)
  }
}

function nanoid(len = 21): string {
  return randomBytes(len).toString('base64url').slice(0, len)
}

function extFromName(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

function err(c: any, code: string, message: string, status = 400) {
  return c.json({ ok: false, error: { code, message } }, status)
}

export const uploadsRouter = new Hono()

// ─── POST /uploads (auth) ──────────────────────────────────────────────────
// multipart/form-data, field name = "file"
uploadsRouter.post('/', requireAuth, async (c) => {
  const userId = (c as any).get('userId') as string
  const max = maxUploadSize()

  // Quick content-length guard (still need to enforce after parse — multipart
  // overhead is small but real)
  const cl = parseInt(c.req.header('content-length') ?? '0', 10)
  if (cl && cl > max + 1024 * 1024) {
    return err(c, 'PAYLOAD_TOO_LARGE', `Upload exceeds ${max} bytes`, 413)
  }

  let body: Record<string, any>
  try {
    body = await c.req.parseBody()
  } catch (e: any) {
    return err(c, 'BAD_MULTIPART', e?.message ?? 'Failed to parse multipart body', 400)
  }

  const file = body['file']
  if (!file || typeof file === 'string' || !(file instanceof File)) {
    return err(c, 'NO_FILE', 'Expected a "file" field with binary content', 400)
  }
  if (file.size > max) {
    return err(c, 'PAYLOAD_TOO_LARGE', `Upload exceeds ${max} bytes`, 413)
  }
  if (file.size === 0) {
    return err(c, 'EMPTY_FILE', 'File is empty', 400)
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const hash = createHash('sha256').update(buf).digest('hex')

  // Dedupe by (owner, hash) — same user re-uploading same bytes returns same row.
  const existing = db.select().from(uploads)
    .where(and(eq(uploads.ownerId, userId), eq(uploads.contentHash, hash)))
    .get()
  if (existing) {
    return c.json({
      ok: true,
      upload: {
        id:           existing.id,
        url:          `/uploads/${existing.id}`,
        size:         existing.size,
        mime:         existing.mime,
        originalName: existing.originalName,
        dedup:        true,
      },
    })
  }

  const originalName = (file as any).name ?? 'upload.bin'
  const mime = (file as any).type || 'application/octet-stream'
  const key = makeStorageKey(hash, extFromName(originalName))

  const storage = getStorage()
  try {
    await storage.put(key, buf)
  } catch (e: any) {
    return err(c, 'STORAGE_WRITE_FAILED', e?.message ?? 'Storage write failed', 500)
  }

  const id = nanoid()
  const now = new Date().toISOString()
  db.insert(uploads).values({
    id,
    ownerId:      userId,
    contentHash:  hash,
    size:         buf.length,
    mime,
    originalName,
    storageKey:   key,
    driver:       storage.driver,
    createdAt:    now,
  }).run()

  return c.json({
    ok: true,
    upload: {
      id,
      url:          `/uploads/${id}`,
      size:         buf.length,
      mime,
      originalName,
      dedup:        false,
    },
  })
})

// ─── GET /uploads/:id (public — files are unguessable IDs) ─────────────────
// We deliberately do NOT require auth on GET — the random 21-char id is the
// capability. Otherwise images couldn't be loaded from share-link pages.
uploadsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')
  const row = db.select().from(uploads).where(eq(uploads.id, id)).get()
  if (!row) return c.notFound()

  const storage = getStorage()
  const head = await storage.head(row.storageKey)
  if (!head) return err(c, 'NOT_FOUND', 'Upload missing on storage', 404)

  const stream = await storage.getStream(row.storageKey)

  // Convert Node Readable → Web ReadableStream for Hono Response
  const webStream = (await import('node:stream')).Readable.toWeb(stream as any) as unknown as ReadableStream

  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Type':        row.mime,
      'Content-Length':      String(row.size),
      'Cache-Control':       'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${encodeURIComponent(row.originalName)}"`,
    },
  })
})
