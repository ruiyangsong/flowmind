/**
 * Auto-provision a JWT secret on first boot.
 *
 * Behaviour:
 *  - If JWT_SECRET env is set: use it verbatim. Done.
 *  - Else: read/write `${DATA_DIR}/.jwt_secret` (default /data/.jwt_secret).
 *    First boot generates a fresh 256-bit key and persists it; later boots reload it.
 *
 * This lets `docker run` work without any required env vars, while still letting
 * advanced users pin JWT_SECRET themselves.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'

function defaultSecretPath(): string {
  // DB_PATH defaults to /data/flowmind.db; secret lives next to it.
  const dbPath = process.env.DB_PATH ?? '/data/flowmind.db'
  return join(dirname(dbPath), '.jwt_secret')
}

export function ensureJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET
  }
  const path = defaultSecretPath()
  mkdirSync(dirname(path), { recursive: true })

  let secret: string
  if (existsSync(path)) {
    secret = readFileSync(path, 'utf-8').trim()
    if (secret.length < 16) secret = ''
  } else {
    secret = ''
  }
  if (!secret) {
    secret = randomBytes(32).toString('base64url')
    writeFileSync(path, secret, { encoding: 'utf-8' })
    try { chmodSync(path, 0o600) } catch { /* windows */ }
    console.log(`[flowmind] generated new JWT secret -> ${path}`)
  }
  process.env.JWT_SECRET = secret
  return secret
}
