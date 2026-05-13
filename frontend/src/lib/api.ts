/**
 * Thin fetch wrapper. Same-origin in production (single container),
 * Vite proxy in dev.
 *
 * Server returns either:
 *   { ok: true, data }     — for success on /auth/me, /documents/*, /share/*
 *   { token, user }        — for /auth/login & /auth/register
 *   { ok: false, error: { code, message } }  — for errors
 */
const BASE = ''

export class ApiError extends Error {
  code: string
  status: number
  constructor(message: string, code = 'UNKNOWN', status = 0) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('fm_token')
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  let json: any
  try { json = await res.json() } catch { json = {} }
  if (!res.ok) {
    // New format: error: { code, message }   |  Legacy: error: "string"
    const e = json?.error
    const msg = typeof e === 'string' ? e : (e?.message ?? `Request failed (${res.status})`)
    const code = typeof e === 'object' ? (e?.code ?? 'UNKNOWN') : 'UNKNOWN'
    throw new ApiError(msg, code, res.status)
  }
  return json
}

export const api = {
  // Auth
  register: (body: { email: string; password: string; name: string }) =>
    req<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    req<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => req<{ ok: boolean; data: any }>('/auth/me'),

  // Documents
  listDocuments: () => req<{ ok: boolean; data: any[] }>('/documents'),
  createDocument: (body: { title?: string; content?: string }) =>
    req<{ ok: boolean; data: any }>('/documents', { method: 'POST', body: JSON.stringify(body) }),
  getDocument: (id: string) => req<{ ok: boolean; data: any }>(`/documents/${id}`),
  updateDocument: (id: string, body: { title?: string; content?: string; isPublic?: boolean }) =>
    req<{ ok: boolean; data: any }>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDocument: (id: string) =>
    req<{ ok: boolean }>(`/documents/${id}`, { method: 'DELETE' }),

  // Share
  createShareToken: (docId: string, body: { mode: 'readonly' | 'collab'; expiresIn?: string }) =>
    req<{ ok: boolean; data: { token: string; mode: string; shareUrl: string; expiresAt: string | null } }>(
      `/share/${docId}`, { method: 'POST', body: JSON.stringify(body) }
    ),
  listShareTokens: (docId: string) => req<{ ok: boolean; data: any[] }>(`/share/${docId}`),
  resolveShareToken: (token: string) =>
    req<{ ok: boolean; data: { documentId: string; title: string; content: string; mode: string; expiresAt: string | null } }>(
      `/share/resolve/${token}`
    ),
  revokeShareToken: (token: string) =>
    req<{ ok: boolean }>(`/share/token/${token}`, { method: 'DELETE' }),
}
