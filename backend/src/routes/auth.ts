import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import type { UserProfile, AuthResponse } from '../lib/types.js'

function getSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(s)
}

/** Scrypt password hashing: `scrypt$N$saltHex$hashHex` */
function hashPassword(plain: string): string {
  const salt = randomBytes(16)
  const N = 16384
  const hash = scryptSync(plain, salt, 64, { N })
  return `scrypt$${N}$${salt.toString('hex')}$${hash.toString('hex')}`
}

function verifyPassword(plain: string, stored: string): boolean {
  // Backwards-compat: old sha256 records
  if (!stored.startsWith('scrypt$')) {
    // Old format `${JWT_SECRET}${plain}` sha256 — we can't verify without the original salt.
    // Treat as legacy: ask user to re-register (return false here). Fresh installs are unaffected.
    return false
  }
  const [, nStr, saltHex, hashHex] = stored.split('$')
  const N = parseInt(nStr)
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(plain, salt, expected.length, { N })
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
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
  return randomBytes(len).toString('base64url').slice(0, len)
}

/** Standardised error response */
function err(c: any, code: string, message: string, status: number) {
  return c.json({ ok: false, error: { code, message } }, status)
}

export const authRouter = new Hono()

// At least 8 chars, must contain a letter and a digit
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
    message: 'Password must contain both letters and digits',
  })

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(64),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

// POST /auth/register
authRouter.post('/register', zValidator('json', registerSchema, (result, c) => {
  if (!result.success) {
    const msg = result.error.errors[0]?.message ?? 'Invalid input'
    return err(c, 'VALIDATION', msg, 400)
  }
}), async (c) => {
  const { email, password, name } = c.req.valid('json')
  const existing = db.select().from(users).where(eq(users.email, email)).get()
  if (existing) return err(c, 'EMAIL_TAKEN', 'Email already registered', 409)

  const id = nanoid()
  const hashed = hashPassword(password)
  const now = new Date().toISOString()
  db.insert(users).values({ id, email, name, password: hashed, createdAt: now }).run()

  const token = await signToken(id)
  const user: UserProfile = { id, email, name, createdAt: now }
  return c.json<AuthResponse>({ token, user }, 201)
})

// POST /auth/login
authRouter.post('/login', zValidator('json', loginSchema, (result, c) => {
  if (!result.success) return err(c, 'VALIDATION', result.error.errors[0]?.message ?? 'Invalid input', 400)
}), async (c) => {
  const { email, password } = c.req.valid('json')
  const user = db.select().from(users).where(eq(users.email, email)).get()
  if (!user) return err(c, 'INVALID_CREDENTIALS', 'Invalid email or password', 401)
  if (!verifyPassword(password, user.password))
    return err(c, 'INVALID_CREDENTIALS', 'Invalid email or password', 401)

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
  if (!token) return err(c, 'UNAUTHENTICATED', 'Missing token', 401)
  try {
    const userId = await verifyToken(token)
    const user = db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) return err(c, 'USER_NOT_FOUND', 'User not found', 404)
    const profile: UserProfile = {
      id: user.id, email: user.email, name: user.name,
      avatarUrl: user.avatarUrl ?? undefined, createdAt: user.createdAt,
    }
    return c.json({ ok: true, data: profile })
  } catch {
    return err(c, 'INVALID_TOKEN', 'Invalid or expired token', 401)
  }
})
