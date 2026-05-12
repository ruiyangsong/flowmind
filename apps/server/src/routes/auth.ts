import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import type { UserProfile, AuthResponse } from '@flowmind/shared'

function getSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(s)
}

async function hashPassword(plain: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  const salt = process.env.JWT_SECRET ?? 'flowmind'
  return createHash('sha256').update(salt + plain).digest('hex')
}

async function signToken(userId: string): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d'
  const seconds = expiresIn.endsWith('d') ? parseInt(expiresIn) * 86400 : parseInt(expiresIn)
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload.sub as string
}

function nanoid(len = 21): string {
  const { randomBytes } = require('node:crypto')
  return randomBytes(len).toString('base64url').slice(0, len)
}

export const authRouter = new Hono()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(64),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /auth/register
authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json')
  const existing = db.select().from(users).where(eq(users.email, email)).get()
  if (existing) return c.json({ ok: false, error: 'Email already registered' }, 409)

  const id = nanoid()
  const hashed = await hashPassword(password)
  const now = new Date().toISOString()
  db.insert(users).values({ id, email, name, password: hashed, createdAt: now }).run()

  const token = await signToken(id)
  const user: UserProfile = { id, email, name, createdAt: now }
  return c.json<AuthResponse>({ token, user }, 201)
})

// POST /auth/login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const user = db.select().from(users).where(eq(users.email, email)).get()
  if (!user) return c.json({ ok: false, error: 'Invalid credentials' }, 401)

  const hashed = await hashPassword(password)
  if (hashed !== user.password) return c.json({ ok: false, error: 'Invalid credentials' }, 401)

  const token = await signToken(user.id)
  const profile: UserProfile = {
    id: user.id, email: user.email, name: user.name,
    avatarUrl: user.avatarUrl ?? undefined, createdAt: user.createdAt,
  }
  return c.json<AuthResponse>({ token, user: profile })
})

// GET /auth/me
authRouter.get('/me', async (c) => {
  const token = (c.req.header('Authorization') ?? '').replace('Bearer ', '')
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401)
  try {
    const userId = await verifyToken(token)
    const user = db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) return c.json({ ok: false, error: 'User not found' }, 404)
    const profile: UserProfile = {
      id: user.id, email: user.email, name: user.name,
      avatarUrl: user.avatarUrl ?? undefined, createdAt: user.createdAt,
    }
    return c.json({ ok: true, data: profile })
  } catch {
    return c.json({ ok: false, error: 'Invalid token' }, 401)
  }
})
