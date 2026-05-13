import React, { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
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

const nodeDefaults = {
  style: {
    background: '#f0fafa',
    border: '1.5px solid #01696f',
    borderRadius: 24,
    padding: '8px 18px',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    color: '#0f3638',
    minWidth: 80,
    textAlign: 'center' as const,
  },
}

function toFlowNodes(data: DiagramData): Node[] {
  return data.nodes.map((n) => ({
    id: n.id,
    data: { label: n.label },
    position: { x: n.x ?? Math.random() * 400, y: n.y ?? Math.random() * 300 },
    ...nodeDefaults,
  }))
}

function toFlowEdges(data: DiagramData): Edge[] {
  return data.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    style: { stroke: '#01696f', strokeWidth: 1.5 },
    animated: false,
  }))
}

export default function MindMap({ data, readonly = false, onChange }: Props) {
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
        { ...conn, id: nanoid(), type: 'smoothstep', style: { stroke: '#01696f', strokeWidth: 1.5 } },
        edges
      )
      setEdges(newEdges)
      emit(nodes, newEdges)
    },
    [edges, nodes, emit, setEdges]
  )

  const addNode = useCallback(() => {
    const id = nanoid()
    const newNode: Node = {
      id,
      data: { label: 'New Node' },
      position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
      ...nodeDefaults,
    }
    const newNodes = [...nodes, newNode]
    setNodes(newNodes)
    emit(newNodes, edges)
  }, [nodes, edges, emit, setNodes])

  return (
    <div className="relative w-full" style={{ height: 380 }}>
      {!readonly && (
        <button
          onClick={addNode}
          className="absolute top-3 right-3 z-10 bg-primary text-white text-xs px-3 py-1.5 rounded-full hover:bg-primary-hover transition-colors"
        >
          + Node
        </button>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readonly ? undefined : (changes) => { onNodesChange(changes); emit(nodes, edges) }}
        onEdgesChange={readonly ? undefined : (changes) => { onEdgesChange(changes); emit(nodes, edges) }}
        onConnect={readonly ? undefined : onConnect}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#dcd9d5" />
        <Controls showInteractive={false} />
        {nodes.length > 6 && <MiniMap nodeStrokeWidth={2} />}
      </ReactFlow>
    </div>
  )
}
