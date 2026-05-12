import { useCallback, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type OnConnect,
  type NodeMouseHandler,
  Panel,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { DiagramData, DiagramNode, DiagramEdge } from '@flowmind/shared'
import { nanoid } from 'nanoid'
import { Plus, Trash2 } from 'lucide-react'

function nodeStyle(type: string) {
  const base = { fontSize: 13, fontFamily: 'Inter, sans-serif', padding: '8px 16px', minWidth: 100 }
  if (type === 'start' || type === 'end') return { ...base, background: '#01696f', color: 'white', borderRadius: 999, border: 'none' }
  if (type === 'decision') return { ...base, background: '#fff8e6', border: '1.5px solid #e8c96d', borderRadius: 4, transform: 'rotate(0deg)' }
  return { ...base, background: '#f9f8f5', border: '1.5px solid #d4d1ca', borderRadius: 6 }
}

function toRFNodes(nodes: DiagramNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    position: { x: n.x ?? 200, y: n.y ?? 100 },
    data: { label: n.label },
    style: nodeStyle(n.type ?? 'process'),
  }))
}

function toRFEdges(edges: DiagramEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#7a7974' },
    style: { stroke: '#7a7974', strokeWidth: 1.5 },
  }))
}

function toData(id: string, nodes: Node[], edges: Edge[]): DiagramData {
  return {
    id, type: 'flowchart',
    nodes: nodes.map((n) => ({ id: n.id, label: String(n.data.label ?? ''), x: n.position.x, y: n.position.y })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: String(e.label ?? '') })),
  }
}

interface Props {
  data: DiagramData
  onChange: (data: DiagramData) => void
  readonly?: boolean
}

export default function FlowchartCanvas({ data, onChange, readonly = false }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toRFNodes(data.nodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRFEdges(data.edges))
  const [selected, setSelected] = useState<string | null>(null)
  const [nodeType, setNodeType] = useState<'process' | 'decision' | 'start' | 'end'>('process')

  const emit = useCallback((ns: Node[], es: Edge[]) => onChange(toData(data.id, ns, es)), [data.id, onChange])

  const onConnect: OnConnect = useCallback((params) => {
    setEdges((es) => {
      const next = addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#7a7974' }, style: { stroke: '#7a7974', strokeWidth: 1.5 } }, es)
      emit(nodes, next)
      return next
    })
  }, [nodes, emit, setEdges])

  const addNode = useCallback(() => {
    const id = nanoid()
    const labels: Record<string, string> = { process: 'Process', decision: 'Decision?', start: 'Start', end: 'End' }
    const newNode: Node = {
      id,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
      data: { label: labels[nodeType] },
      style: nodeStyle(nodeType),
    }
    setNodes((ns) => { const next = [...ns, newNode]; emit(next, edges); return next })
  }, [nodeType, edges, emit, setNodes])

  const deleteSelected = useCallback(() => {
    if (!selected) return
    setNodes((ns) => { const next = ns.filter((n) => n.id !== selected); emit(next, edges); return next })
    setEdges((es) => es.filter((e) => e.source !== selected && e.target !== selected))
    setSelected(null)
  }, [selected, edges, emit, setNodes, setEdges])

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => setSelected(node.id), [])

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_e, node) => {
    if (readonly) return
    const newLabel = window.prompt('Edit label', String(node.data.label ?? ''))
    if (newLabel === null) return
    setNodes((ns) => { const next = ns.map((n) => n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n); emit(next, edges); return next })
  }, [readonly, edges, emit, setNodes])

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={readonly ? undefined : onNodesChange}
      onEdgesChange={readonly ? undefined : onEdgesChange}
      onConnect={readonly ? undefined : onConnect}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      fitView nodesDraggable={!readonly} nodesConnectable={!readonly} elementsSelectable={!readonly}
    >
      <Background color="#e8e6e1" gap={20} />
      <Controls />
      <MiniMap nodeColor="#cedcd8" maskColor="rgba(247,246,242,0.7)" />
      {!readonly && (
        <Panel position="top-left">
          <div className="flex items-center gap-1 flex-wrap">
            <select
              value={nodeType}
              onChange={(e) => setNodeType(e.target.value as any)}
              className="text-xs border border-[#d4d1ca] rounded-lg px-2 py-1.5 bg-white shadow-sm outline-none"
            >
              <option value="process">Process</option>
              <option value="decision">Decision</option>
              <option value="start">Start</option>
              <option value="end">End</option>
            </select>
            <button onClick={addNode} className="flex items-center gap-1 bg-white border border-[#d4d1ca] text-gray-600 text-xs px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-[#f3f0ec] transition">
              <Plus size={13} /> Add
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
