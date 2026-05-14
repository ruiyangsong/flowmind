import { useMemo, useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import dagre from 'dagre'
import type { AstNode } from '@/lib/types'
import { addChild, addSibling, removeNode, renameNode, findNode } from '@/lib/ast'

interface Props {
  ast: AstNode
  onChange: (next: AstNode) => void
  readOnly?: boolean
}

// ── Layout ──────────────────────────────────────────────────────────────────
const NODE_W = 180
const NODE_H = 40

function layout(ast: AstNode): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 60, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodes: Node[] = []
  const edges: Edge[] = []

  const visit = (n: AstNode, parentId?: string) => {
    g.setNode(n.id, { width: NODE_W, height: NODE_H })
    if (parentId) {
      g.setEdge(parentId, n.id)
      edges.push({ id: `${parentId}-${n.id}`, source: parentId, target: n.id, type: 'smoothstep' })
    }
    n.children.forEach((c) => visit(c, n.id))
  }
  visit(ast)

  dagre.layout(g)

  const pushNode = (n: AstNode) => {
    const pos = g.node(n.id)
    nodes.push({
      id: n.id,
      type: n.depth === 0 ? 'mind-root' : 'mind-branch',
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: { text: n.text, depth: n.depth },
      draggable: true,
    })
    n.children.forEach(pushNode)
  }
  pushNode(ast)

  return { nodes, edges }
}

// ── Custom nodes (kept simple — pure CSS) ──────────────────────────────────

function MindRootNode({ data }: { data: { text: string } }) {
  return (
    <div style={{
      width: 180, padding: '8px 12px', borderRadius: 999,
      background: 'var(--accent)', color: '#fff',
      textAlign: 'center', fontWeight: 600, fontSize: 14,
      boxShadow: 'var(--shadow)',
    }}>
      {data.text || 'Root'}
    </div>
  )
}

function MindBranchNode({ data }: { data: { text: string; depth: number } }) {
  const tint = data.depth <= 2
  return (
    <div style={{
      width: 180, padding: '8px 12px', borderRadius: 8,
      background: tint ? 'var(--accent-soft)' : 'var(--panel)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
      textAlign: 'center', fontSize: 13,
      boxShadow: 'var(--shadow)',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {data.text || '(empty)'}
    </div>
  )
}

const nodeTypes = { 'mind-root': MindRootNode, 'mind-branch': MindBranchNode }

// ── Inner component (uses useReactFlow, needs Provider) ────────────────────

function Inner({ ast, onChange, readOnly }: Props) {
  const { nodes, edges } = useMemo(() => layout(ast), [ast])
  const [selectedId, setSelectedId] = useState<string | null>(ast.id)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const rf = useReactFlow()

  // Fit view on first render
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.18, duration: 220 }), 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─ Keyboard handlers ─
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (readOnly) return
    if (editingId) return // let input handle keys
    if (!selectedId) return
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return

    if (e.key === 'Tab') {
      e.preventDefault()
      onChange(addChild(ast, selectedId, 'New'))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // root has no sibling — add child instead
      if (selectedId === ast.id) onChange(addChild(ast, selectedId, 'New'))
      else onChange(addSibling(ast, selectedId, 'New'))
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId === ast.id) return // can't remove root
      e.preventDefault()
      onChange(removeNode(ast, selectedId))
      setSelectedId(ast.id)
    } else if (e.key === 'F2' || e.key === ' ') {
      e.preventDefault()
      const n = findNode(ast, selectedId)
      if (n) { setEditingId(selectedId); setEditingText(n.text) }
    }
  }, [ast, selectedId, editingId, readOnly, onChange])

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  const finishEdit = () => {
    if (editingId) {
      onChange(renameNode(ast, editingId, editingText.trim() || 'Untitled'))
      setEditingId(null)
    }
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        onNodeClick={(_, n) => setSelectedId(n.id)}
        onNodeDoubleClick={(_, n) => {
          if (readOnly) return
          const found = findNode(ast, n.id)
          if (found) { setEditingId(n.id); setEditingText(found.text) }
        }}
        nodesDraggable={false}
        proOptions={{ hideAttribution: true }}
        selectionOnDrag={false}
      >
        <Background gap={20} size={1} color="var(--border-soft)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>

      {/* Selection highlight overlay — purely visual */}
      <style>{`
        .react-flow__node[data-id="${selectedId ?? ''}"] {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
          border-radius: 10px;
        }
      `}</style>

      {/* Edit modal — minimal floating input */}
      {editingId && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)' }}
          onClick={finishEdit}
        >
          <div className="fm-panel fm-slide-up" style={{ width: 360, padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Rename node</div>
            <input
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishEdit()
                if (e.key === 'Escape') setEditingId(null)
              }}
              style={{
                width: '100%', padding: '8px 10px',
                border: '1px solid var(--border)', borderRadius: 6,
                background: 'var(--bg)', color: 'var(--text)',
                outline: 'none',
              }}
            />
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              <kbd className="fm-kbd">Enter</kbd> save · <kbd className="fm-kbd">Esc</kbd> cancel
            </div>
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 5,
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '6px 10px', fontSize: 11, color: 'var(--text-muted)',
        boxShadow: 'var(--shadow)',
      }}>
        <kbd className="fm-kbd">Tab</kbd> child · <kbd className="fm-kbd">Enter</kbd> sibling ·{' '}
        <kbd className="fm-kbd">F2</kbd> rename · <kbd className="fm-kbd">Del</kbd> remove
      </div>
    </div>
  )
}

export default function MindView(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  )
}
