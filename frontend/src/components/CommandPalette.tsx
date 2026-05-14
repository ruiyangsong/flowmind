/**
 * Command Palette — opens with ⌘K (or Ctrl+K) anywhere in the app.
 *
 * Items are dynamic: callers register a fresh list each open. We default to
 * navigation + view-switching + theme commands; pages can extend via items prop.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listLocalDocs } from '@/lib/db'
import { setTheme, getTheme, toggleTheme } from '@/lib/theme'

export interface CommandItem {
  id: string
  label: string
  hint?: string
  group?: string
  /** Keyboard chord display, e.g. ⌘1 */
  shortcut?: string
  run: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  /** Extra commands contributed by the current page */
  extraItems?: CommandItem[]
}

export default function CommandPalette({ open, onClose, extraItems = [] }: Props) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const [docs, setDocs] = useState<{ id: string; title: string }[]>([])
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setIdx(0)
    setTimeout(() => inputRef.current?.focus(), 30)
    listLocalDocs().then((all) => setDocs(all.map((d) => ({ id: d.id, title: d.title || 'Untitled' }))))
  }, [open])

  const items: CommandItem[] = useMemo(() => {
    const base: CommandItem[] = [
      { id: 'go-home', label: 'Go to dashboard', group: 'Navigate', shortcut: 'G H', run: () => navigate('/') },
      { id: 'new-doc', label: 'New document', group: 'Document', shortcut: '⌘N', run: () => {
        // Page handlers may intercept; default just goes home.
        navigate('/')
      } },
      { id: 'theme-light', label: 'Theme: Light', group: 'Theme', run: () => setTheme('light') },
      { id: 'theme-dark',  label: 'Theme: Dark',  group: 'Theme', run: () => setTheme('dark') },
      { id: 'theme-auto', label: `Theme: Auto (currently ${getTheme()})`, group: 'Theme', run: () => setTheme('auto') },
      { id: 'theme-toggle', label: 'Toggle theme', group: 'Theme', shortcut: '⌘⇧L', run: () => toggleTheme() },
      ...docs.slice(0, 30).map((d) => ({
        id: `open-${d.id}`,
        label: `Open: ${d.title}`,
        group: 'Documents',
        run: () => navigate(`/editor/${d.id}`),
      })),
    ]
    return [...extraItems, ...base]
  }, [extraItems, docs, navigate])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    // Fuzzy-ish: every char in order
    return items.filter((it) => fuzzyMatch(it.label.toLowerCase(), s))
  }, [q, items])

  useEffect(() => { setIdx(0) }, [q])

  if (!open) return null

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[idx]
      if (item) { item.run(); onClose() }
    } else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  // Group items
  const groups: Record<string, CommandItem[]> = {}
  filtered.forEach((it) => {
    const g = it.group || 'Other'
    if (!groups[g]) groups[g] = []
    groups[g].push(it)
  })
  // Flat index → group lookup
  let flatIdx = -1

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center fm-fade-in"
      style={{ background: 'rgba(0,0,0,0.35)', paddingTop: '12vh' }}
      onClick={onClose}
    >
      <div
        className="fm-panel fm-slide-up"
        style={{ width: 'min(640px, 92vw)', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-soft)' }}>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a command or search documents…"
            style={{
              width: '100%', background: 'transparent', border: 0, outline: 'none',
              color: 'var(--text)', fontSize: 15,
            }}
          />
        </div>
        <div style={{ overflowY: 'auto', padding: '6px 0' }}>
          {Object.entries(groups).map(([groupName, list]) => (
            <div key={groupName}>
              <div style={{
                padding: '6px 14px', fontSize: 11, letterSpacing: '0.04em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
              }}>{groupName}</div>
              {list.map((it) => {
                flatIdx++
                const active = flatIdx === idx
                return (
                  <button
                    key={it.id}
                    onMouseEnter={() => setIdx(flatIdx)}
                    onClick={() => { it.run(); onClose() }}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '8px 14px',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      color: 'var(--text)',
                      border: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontSize: 14,
                    }}
                  >
                    <span>{it.label}</span>
                    {it.shortcut && <kbd className="fm-kbd">{it.shortcut}</kbd>}
                  </button>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No matches
            </div>
          )}
        </div>
        <div style={{
          padding: '8px 14px', borderTop: '1px solid var(--border-soft)',
          display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)',
        }}>
          <span><kbd className="fm-kbd">↑↓</kbd> navigate</span>
          <span><kbd className="fm-kbd">Enter</kbd> run</span>
          <span><kbd className="fm-kbd">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}

function fuzzyMatch(text: string, q: string): boolean {
  let i = 0
  for (const ch of text) {
    if (ch === q[i]) i++
    if (i === q.length) return true
  }
  return false
}

// ─── Hook: global ⌘K listener ───────────────────────────────────────────────
export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return { open, setOpen }
}
