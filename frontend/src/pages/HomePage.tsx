/**
 * HomePage — dashboard of documents.
 *
 * Local-first list: shows IndexedDB cache instantly, then reconciles with
 * server. Cmd+N creates a new doc; Cmd+K opens the command palette.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Trash2, Search, Brain } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import CommandPalette, { useCommandPalette, type CommandItem } from '@/components/CommandPalette'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { listLocalDocs, saveLocalDoc, deleteLocalDoc } from '@/lib/db'

interface DocRow { id: string; title: string; updatedAt: string }

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { open, setOpen } = useCommandPalette()
  const [docs, setDocs] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  // ── Hydrate from local cache then server ──────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const local = await listLocalDocs()
      if (!cancelled && local.length) {
        setDocs(local.map((d) => ({ id: d.id, title: d.title || 'Untitled', updatedAt: d.updatedAt })))
        setLoading(false)
      }
      try {
        const r = await api.listDocuments()
        if (cancelled) return
        const list: DocRow[] = (r.data || []).map((d: any) => ({
          id: d.id, title: d.title || 'Untitled', updatedAt: d.updatedAt,
        }))
        setDocs(list)
        // sync into local cache
        for (const d of (r.data || [])) {
          await saveLocalDoc({
            id: d.id, title: d.title || 'Untitled',
            content: typeof d.content === 'string' ? d.content : '',
            updatedAt: d.updatedAt, synced: true,
          })
        }
      } catch {
        // offline — keep local
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const createDoc = async () => {
    try {
      const res = await api.createDocument({ title: 'Untitled', content: '' })
      const d = res.data
      await saveLocalDoc({
        id: d.id, title: d.title || 'Untitled',
        content: '', updatedAt: d.updatedAt, synced: true,
      })
      navigate(`/editor/${d.id}`)
    } catch (e: any) {
      alert('Failed to create document: ' + (e?.message || 'unknown'))
    }
  }

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this document?')) return
    setDocs((arr) => arr.filter((x) => x.id !== id))
    try { await api.deleteDocument(id) } catch {}
    await deleteLocalDoc(id)
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      const tag = (e.target as HTMLElement)?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA'
      if (isMod && e.key.toLowerCase() === 'n') { e.preventDefault(); createDoc() }
      if (!isMod && !inField && e.key === '/') { e.preventDefault(); setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return docs
    return docs.filter((d) => d.title.toLowerCase().includes(s))
  }, [q, docs])

  const paletteItems: CommandItem[] = useMemo(() => ([
    { id: 'new', label: 'New document', group: 'Document', shortcut: '⌘N', run: createDoc },
  ]), [])

  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <AppHeader
        left={
          <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search documents…"
              style={{
                width: '100%', padding: '6px 10px 6px 30px',
                background: 'var(--bg-soft)', border: '1px solid var(--border)',
                borderRadius: 6, fontSize: 13, color: 'var(--text)', outline: 'none',
              }}
            />
          </div>
        }
        right={
          <>
            <button
              onClick={() => setOpen(true)}
              title="Command palette (⌘K)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, padding: '6px 10px', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-soft)',
                border: '1px solid var(--border)', borderRadius: 6,
              }}
            >
              <kbd className="fm-kbd">⌘K</kbd>
            </button>
            <button
              onClick={createDoc}
              title="New document (⌘N)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 13, padding: '6px 12px', cursor: 'pointer',
                background: 'var(--accent)', color: '#fff',
                border: 0, borderRadius: 6, fontWeight: 500,
              }}
            >
              <Plus size={14} /> New
            </button>
          </>
        }
      />

      <main style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              {user?.name ? `Welcome, ${user.name}` : 'Documents'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {docs.length} document{docs.length === 1 ? '' : 's'} · Press <kbd className="fm-kbd">⌘N</kbd> to create, <kbd className="fm-kbd">⌘K</kbd> to search commands
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="fm-skeleton" style={{ height: 110, borderRadius: 10 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={createDoc} hasDocs={docs.length > 0} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {filtered.map((d) => (
                <div
                  key={d.id}
                  onClick={() => navigate(`/editor/${d.id}`)}
                  className="fm-fade-in"
                  style={{
                    position: 'relative',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 14,
                    cursor: 'pointer',
                    transition: 'border-color 120ms, box-shadow 120ms, transform 120ms',
                    boxShadow: 'var(--shadow)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    <FileText size={16} />
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{d.title || 'Untitled'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{fmt(d.updatedAt)}</div>
                  <button
                    onClick={(e) => deleteDoc(d.id, e)}
                    title="Delete"
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', color: 'var(--text-muted)',
                      border: 0, borderRadius: 4, cursor: 'pointer',
                      opacity: 0.6,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CommandPalette open={open} onClose={() => setOpen(false)} extraItems={paletteItems} />
    </div>
  )
}

function EmptyState({ onCreate, hasDocs }: { onCreate: () => void; hasDocs: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '80px 20px', textAlign: 'center',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: 14,
        background: 'var(--accent-soft)', color: 'var(--accent)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Brain size={28} />
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
        {hasDocs ? 'No matching documents' : 'Start your first document'}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, maxWidth: 380 }}>
        MindForge gives you one document with three views: Markdown, mind map, and flowchart — same content, three lenses.
      </p>
      <button
        onClick={onCreate}
        style={{
          marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '8px 14px', fontSize: 13, fontWeight: 500,
          background: 'var(--accent)', color: '#fff',
          border: 0, borderRadius: 6, cursor: 'pointer',
        }}
      >
        <Plus size={14} /> New document
      </button>
    </div>
  )
}
