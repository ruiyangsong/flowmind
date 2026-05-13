import React, { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nanoid } from 'nanoid'
import type { DiagramData } from '@/lib/types'

interface Props {
  data: DiagramData
  readonly?: boolean
  onChange?: (data: DiagramData) => void
}

function nodeStyle(type?: string) {
  const base = { fontSize: 13, fontFamily: 'Inter, sans-serif', padding: '8px 16px', minWidth: 90, textAlign: 'center' as const }
  if (type === 'decision') return { ...base, background: '#fffbeb', border: '1.5px solid #d19900', borderRadius: 8, transform: 'rotate(0deg)' }
  if (type === 'start' || type === 'end') return { ...base, background: '#0f3638', color: '#fff', border: 'none', borderRadius: 999 }
  return { ...base, background: '#f0fafa', border: '1.5px solid #01696f', borderRadius: 6 }
}

function toFlowNodes(data: DiagramData): Node[] {
  return data.nodes.map((n) => ({
    id: n.id,
    data: { label: n.label },
    position: { x: n.x ?? 0, y: n.y ?? 0 },
    style: nodeStyle(n.type),
    type: 'default',
  }))
}

function toFlowEdges(data: DiagramData): Edge[] {
  return data.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#01696f' },
    style: { stroke: '#01696f', strokeWidth: 1.5 },
  }))
}

const SHAPES = ['process', 'decision', 'start', 'end'] as const

export default function Flowchart({ data, readonly = false, onChange }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(data))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(data))

  const emit = useCallback(
    (ns: Node[], es: Edge[]) => {
      if (!onChange) return
      onChange({
        ...data,
        nodes: ns.map((n) => ({
          id: n.id,
          label: String(n.data.label),
          x: n.position.x,
          y: n.position.y,
        })),
        edges: es.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: typeof e.label === 'string' ? e.label : undefined,
        })),
      })
    },
    [data, onChange]
  )

  const onConnect = useCallback(
    (conn: Connection) => {
      const newEdges = addEdge(
        {
          ...conn,
          id: nanoid(),
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#01696f' },
          style: { stroke: '#01696f', strokeWidth: 1.5 },
        },
        edges
      )
      setEdges(newEdges)
      emit(nodes, newEdges)
    },
    [edges, nodes, emit, setEdges]
  )

  const addNode = useCallback(
    (shape: string) => {
      const id = nanoid()
      const newNode: Node = {
        id,
        data: { label: shape.charAt(0).toUpperCase() + shape.slice(1) },
        position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
        style: nodeStyle(shape),
        type: 'default',
      }
      const newNodes = [...nodes, newNode]
      setNodes(newNodes)
      emit(newNodes, edges)
    },
    [nodes, edges, emit, setNodes]
  )

  return (
    <div className="relative w-full" style={{ height: 380 }}>
      {!readonly && (
        <div className="absolute top-3 right-3 z-10 flex gap-1">
          {SHAPES.map((s) => (
            <button
              key={s}
              onClick={() => addNode(s)}
              className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded hover:bg-surface-offset transition-colors"
            >
              +{s}
            </button>
          ))}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readonly ? undefined : (c) => { onNodesChange(c); emit(nodes, edges) }}
        onEdgesChange={readonly ? undefined : (c) => { onEdgesChange(c); emit(nodes, edges) }}
        onConnect={readonly ? undefined : onConnect}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#e8e5e0" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
