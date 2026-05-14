import { useMemo, useEffect } from 'react'
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

interface Props {
  ast: AstNode
  onChange: (next: AstNode) => void
  readOnly?: boolean
}

/**
 * Flow view renders flow-tagged children of the AST as a top-down flowchart.
 * Non-flow descendants (headings) collapse into a single "section" node so
 * users can see the overall procedural shape of the document.
 */

const W = 200
const H = 56

function buildGraph(ast: AstNode): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: { id: string; text: string; kind: 'start' | 'process' | 'decision' | 'end' | 'section' }[] = []
  const flowEdges: { source: string; target: string }[] = []

  // Walk depth-first; track previous "flow" node id per parent to chain
  const walk = (parent: AstNode, prevFlowId: string | null) => {
    let lastFlow = prevFlowId
    for (const child of parent.children) {
      if (child.flow) {
        flowNodes.push({ id: child.id, text: child.text, kind: child.flow })
        if (lastFlow) flowEdges.push({ source: lastFlow, target: child.id })
        lastFlow = child.id
      } else {
        // section node summarising a non-flow heading subtree
        flowNodes.push({ id: child.id, text: child.text, kind: 'section' })
        if (lastFlow) flowEdges.push({ source: lastFlow, target: child.id })
        lastFlow = child.id
        // continue walking inside to chain *its* flow children after it
        walk(child, lastFlow)
        // pick up last node id from the just-walked subtree to continue chain
        const last = flowNodes[flowNodes.length - 1]
        if (last) lastFlow = last.id
      }
    }
  }

  // Add an implicit start
  const startId = `${ast.id}__start`
  flowNodes.push({ id: startId, text: ast.text || 'Start', kind: 'start' })
  walk(ast, startId)

  // Dagre layout
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 50, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))
  flowNodes.forEach((n) => g.setNode(n.id, { width: W, height: H }))
  flowEdges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)

  const nodes: Node[] = flowNodes.map((n) => {
    const pos = g.node(n.id)
    return {
      id: n.id,
      type: `flow-${n.kind}`,
      position: { x: pos.x - W / 2, y: pos.y - H / 2 },
      data: { text: n.text },
    }
  })
  const edges: Edge[] = flowEdges.map((e) => ({
    id: `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    animated: false,
  }))
  return { nodes, edges }
}

// ── Custom shape nodes ──────────────────────────────────────────────────────
const baseStyle: React.CSSProperties = {
  width: W,
  minHeight: H,
  padding: '10px 14px',
  fontSize: 13,
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'var(--shadow)',
  color: 'var(--text)',
}

const StartNode = ({ data }: { data: { text: string } }) => (
  <div style={{ ...baseStyle, background: 'var(--success)', color: '#fff', borderRadius: 999 }}>
    {data.text}
  </div>
)
const ProcessNode = ({ data }: { data: { text: string } }) => (
  <div style={{ ...baseStyle, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}>
    {data.text}
  </div>
)
const DecisionNode = ({ data }: { data: { text: string } }) => (
  <div style={{ ...baseStyle, background: 'var(--warning)', color: '#fff', clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', width: W + 40, height: H + 24 }}>
    {data.text}
  </div>
)
const EndNode = ({ data }: { data: { text: string } }) => (
  <div style={{ ...baseStyle, background: 'var(--danger)', color: '#fff', borderRadius: 999 }}>
    {data.text}
  </div>
)
const SectionNode = ({ data }: { data: { text: string } }) => (
  <div style={{
    ...baseStyle,
    background: 'var(--accent-soft)',
    border: '1px dashed var(--accent)',
    borderRadius: 8,
    color: 'var(--accent)',
    fontWeight: 500,
  }}>
    § {data.text}
  </div>
)

const nodeTypes = {
  'flow-start': StartNode,
  'flow-process': ProcessNode,
  'flow-decision': DecisionNode,
  'flow-end': EndNode,
  'flow-section': SectionNode,
}

function Inner({ ast }: Props) {
  const { nodes, edges } = useMemo(() => buildGraph(ast), [ast])
  const rf = useReactFlow()
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.18, duration: 220 }), 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        selectionOnDrag={false}
      >
        <Background gap={20} size={1} color="var(--border-soft)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 5,
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '6px 10px', fontSize: 11, color: 'var(--text-muted)',
        boxShadow: 'var(--shadow)',
        maxWidth: 420,
      }}>
        Flow nodes come from ordered lists. Add steps in Markdown using <kbd className="fm-kbd">1.</kbd> /
        prefix with <kbd className="fm-kbd">判断：</kbd> for a decision diamond.
      </div>
    </div>
  )
}

export default function FlowView(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  )
}
