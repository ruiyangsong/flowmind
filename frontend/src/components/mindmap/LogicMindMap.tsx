import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { DiagramData, MindMapTreeNode } from '@/lib/types'

interface Props {
  data: DiagramData
  readonly?: boolean
  onChange?: (data: DiagramData) => void
}

// ─── Layout constants ───────────────────────────────────────────────────────
const H_GAP = 80          // horizontal gap between depth levels
const V_GAP = 14          // vertical gap between siblings
const ROW_H = 32          // row height per leaf node
const ROOT_PAD_X = 16     // root horizontal padding
const ROOT_PAD_Y = 7      // root vertical padding
const CORNER_R = 8        // elbow radius for connector
const CANVAS_PAD = 24     // canvas outer padding

// Estimate node width based on label length (in chars)
function estimateWidth(label: string, isRoot: boolean): number {
  const charW = 8  // approx px per char for 14px font
  const text = label || ' '
  // Roughly count CJK as 1.7x wide
  let w = 0
  for (const ch of text) {
    w += /[\u4e00-\u9fff\u3000-\u303f]/.test(ch) ? charW * 1.7 : charW
  }
  return Math.max(40, Math.ceil(w) + (isRoot ? ROOT_PAD_X * 2 : 8))
}

interface LayoutNode {
  id: string
  label: string
  depth: number
  x: number          // left edge
  y: number          // vertical center
  w: number
  parentId: string | null
  children: LayoutNode[]
  // for hit-testing parent of a tree update
  pathIndices: number[]  // path of child indices from root
}

function layout(root: MindMapTreeNode): { nodes: LayoutNode[]; width: number; height: number } {
  // Pass 1: compute subtree leaf count to estimate vertical span
  function leafCount(n: MindMapTreeNode): number {
    if (n.children.length === 0) return 1
    return n.children.reduce((s, c) => s + leafCount(c), 0)
  }

  const out: LayoutNode[] = []
  // Pass 2: assign positions
  let cursorY = CANVAS_PAD
  function place(
    n: MindMapTreeNode,
    depth: number,
    parentId: string | null,
    pathIndices: number[]
  ): LayoutNode {
    const w = estimateWidth(n.label, depth === 0)
    if (n.children.length === 0) {
      const ln: LayoutNode = {
        id: n.id,
        label: n.label,
        depth,
        x: CANVAS_PAD + depth * (H_GAP + 120),
        y: cursorY + ROW_H / 2,
        w,
        parentId,
        children: [],
        pathIndices,
      }
      cursorY += ROW_H + V_GAP
      out.push(ln)
      return ln
    }
    const childLayouts = n.children.map((c, i) =>
      place(c, depth + 1, n.id, [...pathIndices, i])
    )
    const firstY = childLayouts[0].y
    const lastY = childLayouts[childLayouts.length - 1].y
    const ln: LayoutNode = {
      id: n.id,
      label: n.label,
      depth,
      x: CANVAS_PAD + depth * (H_GAP + 120),
      y: (firstY + lastY) / 2,
      w,
      parentId,
      children: childLayouts,
      pathIndices,
    }
    out.push(ln)
    return ln
  }
  place(root, 0, null, [])

  const maxX = out.reduce((m, n) => Math.max(m, n.x + n.w), 0)
  const maxY = out.reduce((m, n) => Math.max(m, n.y + ROW_H / 2), 0)
  return {
    nodes: out,
    width: maxX + CANVAS_PAD,
    height: maxY + CANVAS_PAD,
  }
}

// ─── Tree manipulation helpers ──────────────────────────────────────────────
function cloneTree(t: MindMapTreeNode): MindMapTreeNode {
  return { id: t.id, label: t.label, children: t.children.map(cloneTree) }
}

function findByPath(root: MindMapTreeNode, path: number[]): MindMapTreeNode {
  let cur = root
  for (const i of path) cur = cur.children[i]
  return cur
}

function findParentByPath(root: MindMapTreeNode, path: number[]): { parent: MindMapTreeNode; index: number } | null {
  if (path.length === 0) return null
  const parentPath = path.slice(0, -1)
  const idx = path[path.length - 1]
  return { parent: findByPath(root, parentPath), index: idx }
}

function emptyRoot(): MindMapTreeNode {
  return { id: nanoid(), label: 'Central Idea', children: [] }
}

// ─── Connector path: parent right → child left, with rounded elbow ──────────
function connectorPath(px: number, py: number, cx: number, cy: number): string {
  // px,py = parent right-center; cx,cy = child left-center
  const dx = cx - px
  const midX = px + Math.max(20, Math.min(40, dx / 2))
  const r = Math.min(CORNER_R, Math.abs(cy - py) / 2, Math.abs(midX - px))
  const sweep1 = cy > py ? 1 : 0
  const sweep2 = cy > py ? 0 : 1

  if (Math.abs(cy - py) < 1) {
    return `M ${px} ${py} L ${cx} ${cy}`
  }
  // Horiz from parent, arc, vertical, arc, horiz to child
  const vEnd = cy > py ? cy - r : cy + r
  const hEnd = midX + r
  return [
    `M ${px} ${py}`,
    `L ${midX - r} ${py}`,
    `Q ${midX} ${py} ${midX} ${py + (cy > py ? r : -r)}`,
    `L ${midX} ${vEnd}`,
    `Q ${midX} ${cy} ${midX + r} ${cy}`,
    `L ${cx} ${cy}`,
  ].join(' ')
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function LogicMindMap({ data, readonly = false, onChange }: Props) {
  const tree = data.root ?? emptyRoot()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { nodes, width, height } = useMemo(() => layout(tree), [tree])
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const emit = useCallback(
    (newRoot: MindMapTreeNode) => {
      if (!onChange) return
      onChange({ ...data, root: newRoot, nodes: [], edges: [] })
    },
    [data, onChange]
  )

  // Auto-focus editing input
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const startEdit = (id: string) => {
    if (readonly) return
    setEditingId(id)
  }

  const commitLabel = (path: number[], label: string) => {
    const next = cloneTree(tree)
    const node = findByPath(next, path)
    node.label = label.trim() || ' '
    emit(next)
    setEditingId(null)
  }

  // commitAndAdd: write the typed label, then add a child or sibling, in ONE emit.
  // (Calling commitLabel + addChild separately leaks because both clone the same
  //  stale `tree` prop within one React batch.)
  const commitAndAdd = (
    path: number[],
    label: string,
    mode: 'child' | 'sibling'
  ) => {
    const next = cloneTree(tree)
    const target = findByPath(next, path)
    target.label = label.trim() || ' '
    const newNode: MindMapTreeNode = { id: nanoid(), label: 'New', children: [] }
    if (mode === 'child') {
      target.children.push(newNode)
    } else {
      // sibling: insert after `target` under its parent
      if (path.length === 0) return  // can't add sibling to root
      const parentPath = path.slice(0, -1)
      const idx = path[path.length - 1]
      const parent = findByPath(next, parentPath)
      parent.children.splice(idx + 1, 0, newNode)
    }
    emit(next)
    setEditingId(newNode.id)
  }

  const addChild = (path: number[]) => {
    if (readonly) return
    const next = cloneTree(tree)
    const target = findByPath(next, path)
    const child: MindMapTreeNode = { id: nanoid(), label: 'New', children: [] }
    target.children.push(child)
    emit(next)
    setEditingId(child.id)
  }

  const addSibling = (path: number[]) => {
    if (readonly || path.length === 0) return
    const next = cloneTree(tree)
    const found = findParentByPath(next, path)
    if (!found) return
    const sib: MindMapTreeNode = { id: nanoid(), label: 'New', children: [] }
    found.parent.children.splice(found.index + 1, 0, sib)
    emit(next)
    setEditingId(sib.id)
  }

  const removeNode = (path: number[]) => {
    if (readonly || path.length === 0) return
    const next = cloneTree(tree)
    const found = findParentByPath(next, path)
    if (!found) return
    found.parent.children.splice(found.index, 1)
    emit(next)
  }

  // Drag-reorder among siblings
  const onDragStart = (e: React.DragEvent, id: string) => {
    if (readonly) return
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  const onDragOver = (e: React.DragEvent, id: string) => {
    if (!dragId || dragId === id) return
    const a = nodeById.get(dragId)
    const b = nodeById.get(id)
    if (!a || !b || a.parentId !== b.parentId || a.parentId === null) return
    e.preventDefault()
    setDragOverId(id)
  }
  const onDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (!dragId || dragId === id) { setDragId(null); setDragOverId(null); return }
    const a = nodeById.get(dragId)
    const b = nodeById.get(id)
    setDragId(null)
    setDragOverId(null)
    if (!a || !b || a.parentId !== b.parentId || a.parentId === null) return
    const parentPath = a.pathIndices.slice(0, -1)
    const next = cloneTree(tree)
    const parent = findByPath(next, parentPath)
    const fromIdx = a.pathIndices[a.pathIndices.length - 1]
    const toIdx = b.pathIndices[b.pathIndices.length - 1]
    const [moved] = parent.children.splice(fromIdx, 1)
    const insertAt = fromIdx < toIdx ? toIdx : toIdx
    parent.children.splice(insertAt, 0, moved)
    emit(next)
  }

  return (
    <div className="bg-white" style={{ minHeight: 200 }}>
      <div className="relative overflow-auto" style={{ maxHeight: 520 }}>
        <div className="relative" style={{ width, height }}>
          {/* Connectors */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
          >
            {nodes.map((n) => {
              if (!n.parentId) return null
              const p = nodeById.get(n.parentId)
              if (!p) return null
              const px = p.x + p.w
              const py = p.y
              const cx = n.x
              const cy = n.y
              return (
                <path
                  key={`e-${n.id}`}
                  d={connectorPath(px, py, cx, cy)}
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  fill="none"
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((n) => {
            const isRoot = n.depth === 0
            const isEditing = editingId === n.id
            const isHover = hoverId === n.id
            const isDragOver = dragOverId === n.id
            return (
              <div
                key={n.id}
                className="absolute group"
                style={{
                  left: n.x,
                  top: n.y - ROW_H / 2,
                  height: ROW_H,
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId((cur) => (cur === n.id ? null : cur))}
                draggable={!readonly && !isRoot && !isEditing}
                onDragStart={(e) => onDragStart(e, n.id)}
                onDragOver={(e) => onDragOver(e, n.id)}
                onDrop={(e) => onDrop(e, n.id)}
              >
                {/* drop indicator */}
                {isDragOver && (
                  <div
                    className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {isEditing ? (
                  <input
                    ref={inputRef}
                    defaultValue={n.label}
                    onBlur={(e) => commitLabel(n.pathIndices, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const val = (e.target as HTMLInputElement).value
                        if (isRoot) {
                          commitLabel(n.pathIndices, val)
                        } else {
                          commitAndAdd(n.pathIndices, val, 'sibling')
                        }
                      } else if (e.key === 'Tab') {
                        e.preventDefault()
                        const val = (e.target as HTMLInputElement).value
                        commitAndAdd(n.pathIndices, val, 'child')
                      } else if (e.key === 'Escape') {
                        setEditingId(null)
                      }
                    }}
                    className={
                      isRoot
                        ? 'bg-blue-600 text-white text-sm rounded-md outline-none border-none'
                        : 'bg-blue-50 text-gray-900 text-sm rounded outline-none border border-blue-300'
                    }
                    style={{
                      padding: isRoot ? `${ROOT_PAD_Y}px ${ROOT_PAD_X}px` : '2px 4px',
                      width: Math.max(80, n.w),
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <div
                    onClick={() => startEdit(n.id)}
                    className={
                      isRoot
                        ? 'bg-blue-600 text-white text-sm rounded-md select-none cursor-text shadow-sm'
                        : 'text-gray-900 text-sm select-none cursor-text whitespace-nowrap hover:bg-gray-50 rounded px-1'
                    }
                    style={{
                      padding: isRoot ? `${ROOT_PAD_Y}px ${ROOT_PAD_X}px` : '2px 4px',
                      fontWeight: isRoot ? 600 : 400,
                    }}
                  >
                    {n.label || (
                      <span className={isRoot ? 'text-blue-100' : 'text-gray-300'}>(empty)</span>
                    )}
                  </div>
                )}

                {/* hover actions */}
                {!readonly && !isEditing && isHover && (
                  <>
                    <button
                      onClick={() => addChild(n.pathIndices)}
                      title="Add child"
                      className="ml-1 w-5 h-5 rounded-full bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-400 flex items-center justify-center"
                    >
                      <Plus size={12} />
                    </button>
                    {!isRoot && (
                      <button
                        onClick={() => removeNode(n.pathIndices)}
                        title="Delete"
                        className="ml-1 w-5 h-5 rounded-full bg-white border border-gray-300 hover:border-red-500 hover:text-red-500 text-gray-400 flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {!readonly && (
        <div className="px-3 py-1.5 text-[11px] text-gray-400 border-t border-gray-100">
          Click to edit · Enter: new sibling · Tab: new child · Drag to reorder
        </div>
      )}
    </div>
  )
}
