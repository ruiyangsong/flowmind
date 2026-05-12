const BASE = ''

function getToken() {
  return localStorage.getItem('fm_token') ?? ''
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json
}

export const api = {
  // Auth
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: any }>('POST', '/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('POST', '/auth/login', { email, password }),
  me: () => request<{ ok: boolean; data: any }>('GET', '/auth/me'),

  // Documents
  listDocs: () => request<{ ok: boolean; data: any[] }>('GET', '/documents'),
  createDoc: (title?: string, content?: string) =>
    request<{ ok: boolean; data: any }>('POST', '/documents', { title, content }),
  getDoc: (id: string) => request<{ ok: boolean; data: any }>('GET', `/documents/${id}`),
  updateDoc: (id: string, patch: { title?: string; content?: string; isPublic?: boolean }) =>
    request<{ ok: boolean; data: any }>('PATCH', `/documents/${id}`, patch),
  deleteDoc: (id: string) => request<{ ok: boolean }>('DELETE', `/documents/${id}`),

  // Share
  createShare: (docId: string, mode: 'readonly' | 'collab', expiresIn = '30d') =>
    request<{ ok: boolean; data: { token: string; mode: string; shareUrl: string; expiresAt: string | null } }>(
      'POST', `/share/${docId}`, { mode, expiresIn }
    ),
  listShares: (docId: string) => request<{ ok: boolean; data: any[] }>('GET', `/share/${docId}`),
  resolveShare: (token: string) =>
    request<{ ok: boolean; data: any }>('GET', `/share/resolve/${token}`),
  revokeShare: (token: string) => request<{ ok: boolean }>('DELETE', `/share/token/${token}`),
}
