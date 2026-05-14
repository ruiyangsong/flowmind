/**
 * SharePage — public read-only / collab view, with the same three-view
 * affordance but no save / dashboard chrome.
 */

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, GitBranch, Workflow, Brain, type LucideIcon } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import MarkdownEditor from '@/components/editor/MarkdownEditor'
import MindView from '@/components/views/MindView'
import FlowView from '@/components/views/FlowView'
import { api } from '@/lib/api'
import { markdownToAst } from '@/lib/ast'
import type { AstNode, ViewMode } from '@/lib/types'

interface Props { collab?: boolean }

export default function SharePage({ collab = false }: Props) {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<{ documentId: string; title: string; content: string; mode: string } | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<ViewMode>('markdown')

  useEffect(() => {
    if (!token) return
    api.resolveShareToken(token)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.message || 'Failed to load shared document'))
  }, [token])

  const ast: AstNode | null = useMemo(() => {
    if (!data) return null
    const a = markdownToAst(data.content || '')
    a.text = data.title || 'Untitled'
    return a
  }, [data])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: 'var(--bg)', color: 'var(--text)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 500 }}>Link unavailable</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!data || !ast) {
    return (
      <div style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)',
      }}>
        <div style={{
          width: 28, height: 28,
          border: '2px solid var(--accent)', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const readOnly = data.mode === 'readonly' || !collab

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 14px', height: 48,
        background: 'var(--panel)', borderBottom: '1px solid var(--border-soft)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Brain size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>MindForge</span>
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{data.title || 'Untitled'}</span>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 999,
          background: 'var(--bg-sunken)', color: 'var(--text-muted)',
        }}>
          {readOnly ? 'Read only' : 'Collaborative'}
        </span>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, padding: 2, background: 'var(--bg-sunken)', borderRadius: 8 }}>
          <Tab active={view === 'markdown'} onClick={() => setView('markdown')} icon={FileText} label="Markdown" />
          <Tab active={view === 'mind'}     onClick={() => setView('mind')}     icon={GitBranch} label="Mind" />
          <Tab active={view === 'flow'}     onClick={() => setView('flow')}     icon={Workflow}  label="Flow" />
        </div>

        <ThemeToggle />
      </header>

      <main style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {view === 'markdown' && <MarkdownEditor value={data.content} onChange={() => {}} readOnly />}
        {view === 'mind'     && <MindView ast={ast} onChange={() => {}} readOnly />}
        {view === 'flow'     && <FlowView ast={ast} onChange={() => {}} readOnly />}
      </main>
    </div>
  )
}

function Tab({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button
      onClick={onClick}
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
