// ─── Document ───────────────────────────────────────────────────────────────

export type DocumentType = 'document'

export interface Document {
  id: string
  title: string
  content: string       // Tiptap JSON serialized
  createdAt: string     // ISO 8601
  updatedAt: string
  ownerId: string
  isPublic: boolean
}

// ─── Share / Collab tokens ───────────────────────────────────────────────────

export type ShareMode = 'readonly' | 'collab'

export interface ShareToken {
  documentId: string
  mode: ShareMode
  expiresAt?: string
}

// ─── Diagram blocks embedded in document ────────────────────────────────────

export type DiagramType = 'mindmap' | 'flowchart'

export interface DiagramNode {
  id: string
  label: string
  x?: number
  y?: number
  parentId?: string
  type?: string         // for flowchart: 'process' | 'decision' | 'start' | 'end'
}

export interface DiagramEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface DiagramData {
  id: string
  type: DiagramType
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  viewport?: { x: number; y: number; zoom: number }
}

// ─── API Response wrapper ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
  createdAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  token: string
  user: UserProfile
}
