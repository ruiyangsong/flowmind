// ─── Document ───────────────────────────────────────────────────────────────

export type DocumentType = 'document'

export interface Document {
  id: string
  title: string
  /** Plain Markdown — single source of truth */
  content: string
  createdAt: string
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

// ─── View modes ──────────────────────────────────────────────────────────────

export type ViewMode = 'markdown' | 'mind' | 'flow'

// ─── AST (the single source of truth across three views) ───────────────────

/**
 * Universal node model — every section / list-item / flow-step is a Node.
 * IDs are stable across view switches so mind/flow can preserve positions.
 */
export interface AstNode {
  id: string
  /** Tree depth, 0 = root */
  depth: number
  /** Display text (heading title / list item text / flow step label) */
  text: string
  /**
   * Optional rich body — markdown chunks that belong to this node but are
   * not themselves further sub-headings (paragraphs / code / math / etc).
   */
  body?: string
  /** Semantic flavour for flow view */
  flow?: 'start' | 'process' | 'decision' | 'end'
  /** Optional per-view metadata */
  mind?: { color?: string; collapsed?: boolean }
  pos?: { x: number; y: number }
  children: AstNode[]
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
