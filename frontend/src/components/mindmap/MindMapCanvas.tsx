import { useCallback, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type OnConnect,
  type NodeMouseHandler,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { DiagramData, DiagramNode, DiagramEdge } from '@/lib/types'
import { nanoid } from 'nanoid'
import { Plus, Trash2 } from 'lucide-react'

function toRFNodes(nodes: DiagramNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    position: { x: n.x ?? 100, y: n.y ?? 100 },
    data: { label: n.label },
    type: 'default',
    style: {
      background: '#f9f8f5',
      border: '1.5px solid #d4d1ca',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      minWidth: 80,
    },
  }))
}

function toRFEdges(edges: DiagramEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    style: { stroke: '#d4d1ca', strokeWidth: 1.5 },
  }))
}

function toData(id: string, nodes: Node[], edges: Edge[]): DiagramData {
  return {
    id,
    type: 'mindmap',
    nodes: nodes.map((n) => ({ id: n.id, label: String(n.data.label ?? ''), x: n.position.x, y: n.position.y })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: String(e.label ?? '') })),
  }
}

interface Props {
  data: DiagramData
  onChange: (data: DiagramData) => void
  readonly?: boolean
}

export default function MindMapCanvas({ data, onChange, readonly = false }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toRFNodes(data.nodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRFEdges(data.edges))
  const [selected, setSelected] = useState<string | null>(null)

  const emit = useCallback((ns: Node[], es: Edge[]) => {
    onChange(toData(data.id, ns, es))
  }, [data.id, onChange])

  const onConnect: OnConnect = useCallback((params) => {
    setEdges((es) => {
      const next = addEdge({ ...params, type: 'smoothstep', style: { stroke: '#d4d1ca', strokeWidth: 1.5 } }, es)
      emit(nodes, next)
      return next
    })
  }, [nodes, emit, setEdges])

  const addNode = useCallback(() => {
    const id = nanoid()
    const newNode: Node = {
      id,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
      data: { label: 'New Idea' },
      style: { background: '#f9f8f5', border: '1.5px solid #d4d1ca', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontFamily: 'Inter, sans-serif', minWidth: 80 },
    }
    setNodes((ns) => { const next = [...ns, newNode]; emit(next, edges); return next })
  }, [edges, emit, setNodes])

  const deleteSelected = useCallback(() => {
    if (!selected) return
    setNodes((ns) => { const next = ns.filter((n) => n.id !== selected); emit(next, edges); return next })
    setEdges((es) => { const next = es.filter((e) => e.source !== selected && e.target !== selected); return next })
    setSelected(null)
  }, [selected, edges, emit, setNodes, setEdges])

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => setSelected(node.id), [])

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_e, node) => {
    if (readonly) return
    const newLabel = window.prompt('Edit label', String(node.data.label ?? ''))
    if (newLabel === null) return
    setNodes((ns) => {
      const next = ns.map((n) => n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n)
      emit(next, edges)
      return next
    })
  }, [readonly, edges, emit, setNodes])

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={readonly ? undefined : (changes) => { onNodesChange(changes); setTimeout(() => emit(nodes, edges), 0) }}
      onEdgesChange={readonly ? undefined : onEdgesChange}
      onConnect={readonly ? undefined : onConnect}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      fitView
      nodesDraggable={!readonly}
      nodesConnectable={!readonly}
      elementsSelectable={!readonly}
    >
      <Background color="#e8e6e1" gap={20} />
      <Controls />
      <MiniMap nodeColor="#cedcd8" maskColor="rgba(247,246,242,0.7)" />
      {!readonly && (
        <Panel position="top-left">
          <div className="flex gap-1">
            <button onClick={addNode} className="flex items-center gap-1 bg-white border border-[#d4d1ca] text-gray-600 text-xs px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-[#f3f0ec] transition">
              <Plus size={13} /> Add Node
            </button>
            {selected && (
              <button onClick={deleteSelected} className="flex items-center gap-1 bg-white border border-red-200 text-red-500 text-xs px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-red-50 transition">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </Panel>
      )}
    </ReactFlow>
  )
}
