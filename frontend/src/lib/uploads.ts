/**
 * Upload helper. POSTs a File to /uploads (multipart) and returns the URL to embed.
 *
 * Server returns: { ok: true, upload: { id, url, size, mime, originalName, dedup } }
 */
import { ApiError } from './api'

export interface UploadResult {
  id: string
  url: string         // relative path, e.g. /uploads/<id>
  size: number
  mime: string
  originalName: string
  dedup: boolean
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const token = localStorage.getItem('fm_token')
  const fd = new FormData()
  fd.append('file', file, file.name || 'paste.bin')

  const res = await fetch('/uploads', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })

  let json: any
  try { json = await res.json() } catch { json = {} }

  if (!res.ok || !json?.ok) {
    const e = json?.error
    const msg  = typeof e === 'string' ? e : (e?.message ?? `Upload failed (${res.status})`)
    const code = typeof e === 'object' ? (e?.code ?? 'UNKNOWN') : 'UNKNOWN'
    throw new ApiError(msg, code, res.status)
  }
  return json.upload as UploadResult
}

/** True when this file is something the editor should embed inline as an image. */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}
