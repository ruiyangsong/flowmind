/**
 * EditorPage — the three-view workspace.
 *
 * Layout:
 *   ┌───────────────────────── AppHeader ─────────────────────────┐
 *   │  title input · view tabs (⌘1/2/3) · split toggle (⌘\)       │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │  active view                                                 │
 *   │  (in split mode: Markdown on the left, mind/flow on right)   │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Data flow:
 *   markdown (Document.content)  ── markdownToAst ──▶  ast  ──┐
 *                                                              ▶ MindView/FlowView
 *                                              ◀── astToMarkdown ─┘
 *
 * Local-first: every change debounces 500ms → IndexedDB; 2s → server.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, GitBranch, Workflow, Columns2, Share2, Loader2, Check, type LucideIcon } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import CommandPalette, { useCommandPalette, type CommandItem } from '@/components/CommandPalette'
import MarkdownEditor from '@/components/editor/MarkdownEditor'
import MindView from '@/components/views/MindView'
import FlowView from '@/components/views/FlowView'
import { api } from '@/lib/api'
import { saveLocalDoc, getLocalDoc } from '@/lib/db'
import { markdownToAst, astToMarkdown } from '@/lib/ast'
import type { AstNode, ViewMode } from '@/lib/types'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function EditorPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { open, setOpen } = useCommandPalette()

  const [title, setTitle] = useState('Untitled')
  const [content, setContent] = useState('')
  const [view, setView] = useState<ViewMode>('markdown')
  const [split, setSplit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const lastSavedRef = useRef<string>('')

  // ── Hydrate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      // Try local cache first for instant paint
      const cached = await getLocalDoc(id)
      if (cached && !cancelled) {
        setTitle(cached.title || 'Untitled')
        setContent(cached.content || '')
        lastSavedRef.current = cached.content || ''
      }
      // Then refresh from server (gracefully)
      try {
        const res = await api.getDocument(id)
        if (cancelled) return
        const d = res.data
        const remoteContent: string = typeof d?.content === 'string' ? d.content : ''
        setTitle(d?.title || 'Untitled')
        setContent(remoteContent)
        lastSavedRef.current = remoteContent
        await saveLocalDoc({
          id, title: d?.title || 'Untitled',
          content: remoteContent,
          updatedAt: d?.updatedAt || new Date().toISOString(),
          synced: true,
        })
      } catch {
        // offline / new doc — keep cached
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  // ── Persistence (local 500ms / remote 2s, debounced) ──────────────────────
  const persistTimerRef = useRef<{ local?: number; remote?: number }>({})
  const schedulePersist = useCallback((nextTitle: string, nextContent: string) => {
    const t = persistTimerRef.current
    if (t.local) window.clearTimeout(t.local)
    if (t.remote) window.clearTimeout(t.remote)
    setSaveState('saving')

    t.local = window.setTimeout(async () => {
      await saveLocalDoc({
        id, title: nextTitle, content: nextContent,
        updatedAt: new Date().toISOString(),
        synced: false,
      })
    }, 500)

    t.remote = window.setTimeout(async () => {
      try {
        await api.updateDocument(id, { title: nextTitle, content: nextContent })
        lastSavedRef.current = nextContent
        await saveLocalDoc({
          id, title: nextTitle, content: nextContent,
          updatedAt: new Date().toISOString(),
          synced: true,
        })
        setSaveState('saved')
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500)
      } catch {
        setSaveState('error')
      }
    }, 2000)
  }, [id])

  const onTitleChange = (v: string) => {
    setTitle(v)
    schedulePersist(v, content)
  }
  const onContentChange = (v: string) => {
    setContent(v)
    schedulePersist(title, v)
  }

  // ── AST derivation for mind/flow views ────────────────────────────────────
  const ast: AstNode = useMemo(() => {
    const a = markdownToAst(content)
    // Use document title as root text
    a.text = title || 'Untitled'
    return a
  }, [content, title])

  const onAstChange = (next: AstNode) => {
    // Title stays in the title field; root text mirrors title
    next.text = title
    const md = astToMarkdown(next)
    onContentChange(md)
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      const tag = (e.target as HTMLElement)?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA'
      if (isMod && e.key === '1') { e.preventDefault(); setView('markdown') }
      else if (isMod && e.key === '2') { e.preventDefault(); setView('mind') }
      else if (isMod && e.key === '3') { e.preventDefault(); setView('flow') }
      else if (isMod && e.key === '\\') { e.preventDefault(); setSplit((s) => !s) }
      else if (isMod && e.key === 's') { e.preventDefault(); schedulePersist(title, content) }
      else if (!inField && !isMod && e.key === '/') {
        // Quick-open palette
        e.preventDefault(); setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [title, content, schedulePersist, setOpen])

  // ── Share ─────────────────────────────────────────────────────────────────
  const onShare = async () => {
    try {
      const res = await api.createShareToken(id, { mode: 'readonly' })
      const url = window.location.origin + '/share/' + res.data.token
      await navigator.clipboard?.writeText(url).catch(() => {})
      alert('Share link copied:\n' + url)
    } catch (e: any) {
      alert('Share failed: ' + (e?.message || 'unknown'))
    }
  }

  // ── Command palette page-level commands ───────────────────────────────────
  const paletteItems: CommandItem[] = useMemo(() => ([
    { id: 'view-md',   label: 'View: Markdown',    group: 'View', shortcut: '⌘1', run: () => setView('markdown') },
    { id: 'view-mind', label: 'View: Mind map',    group: 'View', shortcut: '⌘2', run: () => setView('mind') },
    { id: 'view-flow', label: 'View: Flowchart',   group: 'View', shortcut: '⌘3', run: () => setView('flow') },
    { id: 'split',     label: split ? 'Disable split view' : 'Enable split view', group: 'View', shortcut: '⌘\\', run: () => setSplit((s) => !s) },
    { id: 'share',     label: 'Share document (copy link)', group: 'Document', run: onShare },
    { id: 'back',      label: 'Back to dashboard', group: 'Navigate', run: () => navigate('/') },
  ]), [split, navigate])

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <AppHeader
        left={
          <>
            <button
              onClick={() => navigate('/')}
              title="Back (Esc)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 13, padding: '6px 10px', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-soft)',
                border: '1px solid var(--border)', borderRadius: 6,
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled"
              style={{
                background: 'transparent', border: 0, outline: 'none',
                fontSize: 14, fontWeight: 500, color: 'var(--text)',
                minWidth: 200, maxWidth: 360,
              }}
            />
            <SaveBadge state={saveState} />
          </>
        }
        center={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, padding: 2, background: 'var(--bg-sunken)', borderRadius: 8 }}>
            <ViewTab active={view === 'markdown'} onClick={() => setView('markdown')} icon={FileText} label="Markdown" shortcut="⌘1" />
            <ViewTab active={view === 'mind'}     onClick={() => setView('mind')}     icon={GitBranch} label="Mind"     shortcut="⌘2" />
            <ViewTab active={view === 'flow'}     onClick={() => setView('flow')}     icon={Workflow}  label="Flow"     shortcut="⌘3" />
          </div>
        }
        right={
          <>
            <button
              onClick={() => setSplit((s) => !s)}
              title="Toggle split view (⌘\)"
              style={{
                width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: split ? 'var(--accent-soft)' : 'transparent',
                color: split ? 'var(--accent)' : 'var(--text-soft)',
                border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
              }}
            >
              <Columns2 size={16} />
            </button>
            <button
              onClick={onShare}
              title="Share"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 13, padding: '6px 10px', cursor: 'pointer',
                background: 'var(--accent)', color: '#fff',
                border: 0, borderRadius: 6,
              }}
            >
              <Share2 size={14} /> Share
            </button>
          </>
        }
      />

      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {loading ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : split ? (
          <>
            <Pane>
              <MarkdownEditor value={content} onChange={onContentChange} onCommand={() => setOpen(true)} />
            </Pane>
            <div style={{ width: 1, background: 'var(--border-soft)' }} />
            <Pane>
              {view === 'flow'
                ? <FlowView ast={ast} onChange={onAstChange} />
                : <MindView ast={ast} onChange={onAstChange} />}
            </Pane>
          </>
        ) : (
          <Pane>
            {view === 'markdown' && <MarkdownEditor value={content} onChange={onContentChange} onCommand={() => setOpen(true)} />}
            {view === 'mind'     && <MindView     ast={ast}    onChange={onAstChange} />}
            {view === 'flow'     && <FlowView     ast={ast}    onChange={onAstChange} />}
          </Pane>
        )}
      </main>

      <CommandPalette open={open} onClose={() => setOpen(false)} extraItems={paletteItems} />
    </div>
  )
}

// ─── Small UI helpers ──────────────────────────────────────────────────────

function Pane({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}>{children}</div>
}

function ViewTab({
  active, onClick, icon: Icon, label, shortcut,
}: {
  active: boolean; onClick: () => void; icon: LucideIcon; label: string; shortcut: string
}) {
  return (
    <button
      onClick={onClick}
      title={`${label} (${shortcut})`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', fontSize: 13,
        background: active ? 'var(--panel)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-soft)',
        boxShadow: active ? 'var(--shadow)' : 'none',
        border: 0, borderRadius: 6, cursor: 'pointer',
        fontWeight: active ? 600 : 400,
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  const map = {
    saving: { icon: Loader2, text: 'Saving', spin: true,  color: 'var(--text-muted)' },
    saved:  { icon: Check,   text: 'Saved',  spin: false, color: 'var(--success)' },
    error:  { icon: FileText,text: 'Offline',spin: false, color: 'var(--warning)' },
  } as const
  const m = map[state]
  const Icon = m.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: m.color }}>
      <Icon size={12} className={m.spin ? 'animate-spin' : ''} /> {m.text}
    </span>
  )
}
