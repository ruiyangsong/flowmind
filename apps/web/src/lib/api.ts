const BASE = ''

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
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
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
