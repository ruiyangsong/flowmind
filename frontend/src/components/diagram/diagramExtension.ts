import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import DiagramBlock from './DiagramBlock'
import type { DiagramData } from '@/lib/types'

export const DiagramExtension = Node.create({
  name: 'diagramBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      diagramData: {
        default: null,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-diagram')
          return raw ? JSON.parse(raw) : null
        },
        renderHTML: (attrs) => ({
          'data-diagram': JSON.stringify(attrs.diagramData),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-diagram]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramBlock)
  },
})

export function createDiagram(type: 'mindmap' | 'flowchart'): DiagramData {
  if (type === 'mindmap') {
    return {
      id: crypto.randomUUID(),
      type: 'mindmap',
      nodes: [
        { id: '1', label: 'Main Topic', x: 200, y: 150 },
        { id: '2', label: 'Branch A', x: 400, y: 80 },
        { id: '3', label: 'Branch B', x: 400, y: 220 },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e1-3', source: '1', target: '3' },
      ],
    }
  }
  return {
    id: crypto.randomUUID(),
    type: 'flowchart',
    nodes: [
      { id: '1', label: 'Start', type: 'start', x: 200, y: 30 },
      { id: '2', label: 'Process', type: 'process', x: 200, y: 140 },
      { id: '3', label: 'Decision', type: 'decision', x: 200, y: 250 },
      { id: '4', label: 'End', type: 'end', x: 200, y: 360 },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
    ],
  }
}
