/**
 * Storage adapter abstraction.
 *
 * v0.3 ships only the `local` driver (filesystem under DATA_DIR/uploads).
 * The `s3` driver is intentionally a stub — adding it later just means
 * implementing the same StorageAdapter interface with AWS SDK. No callers
 * need to change.
 *
 * Layout (local):
 *   ${UPLOAD_DIR}/<2-char-prefix>/<sha256>.<ext>
 *
 * `storageKey` stored in DB is driver-relative, e.g. "ab/abcdef...png".
 */
import { mkdir, writeFile, readFile, stat, access } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Readable } from 'node:stream'

export interface StorageAdapter {
  driver: string
  /** Persist bytes under `key`. Idempotent — if key already exists, do nothing. */
  put(key: string, data: Buffer): Promise<void>
  /** Read bytes back as a Node Readable stream. */
  getStream(key: string): Promise<Readable>
  /** Optional metadata (size on disk). */
  head(key: string): Promise<{ size: number } | null>
}

// ─── Local FS driver ────────────────────────────────────────────────────────
class LocalDriver implements StorageAdapter {
  readonly driver = 'local'
  constructor(private root: string) {}

  private full(key: string) { return join(this.root, key) }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.full(key)
    try {
      await access(path)
      return // already exists — content-addressed dedupe at filesystem level
    } catch { /* not exists, fall through */ }
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, data)
  }

  async getStream(key: string) {
    return createReadStream(this.full(key)) as unknown as Readable
  }

  async head(key: string) {
    try {
      const s = await stat(this.full(key))
      return { size: s.size }
    } catch { return null }
  }
}

// ─── S3 driver (stub) ───────────────────────────────────────────────────────
// Intentionally throws — wiring AWS SDK is deferred to a later release so the
// Docker image stays slim. Set STORAGE_DRIVER=local (default) to use FS.
class S3DriverStub implements StorageAdapter {
  readonly driver = 's3'
  async put(): Promise<void> { throw new Error('S3 driver not implemented yet (v0.3 uses local)') }
  async getStream(): Promise<Readable> { throw new Error('S3 driver not implemented yet (v0.3 uses local)') }
  async head() { return null }
}

// ─── Factory ────────────────────────────────────────────────────────────────
function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR) return resolve(process.env.UPLOAD_DIR)
  // Same convention as DB_PATH default
  const isProd = process.env.NODE_ENV === 'production'
  return resolve(isProd ? '/data/uploads' : './data/uploads')
}

let _adapter: StorageAdapter | null = null
export function getStorage(): StorageAdapter {
  if (_adapter) return _adapter
  const driver = (process.env.STORAGE_DRIVER ?? 'local').toLowerCase()
  if (driver === 's3') {
    _adapter = new S3DriverStub()
  } else {
    _adapter = new LocalDriver(resolveUploadDir())
  }
  return _adapter
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function makeStorageKey(hash: string, ext: string): string {
  const cleanExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8)
  const prefix = hash.slice(0, 2)
  return cleanExt ? `${prefix}/${hash}.${cleanExt}` : `${prefix}/${hash}`
}

export function maxUploadSize(): number {
  const raw = process.env.MAX_UPLOAD_SIZE
  if (!raw) return 25 * 1024 * 1024 // 25MB default
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 25 * 1024 * 1024
}
