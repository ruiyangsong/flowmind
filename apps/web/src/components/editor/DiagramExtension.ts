import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import DiagramNodeView from './DiagramNodeView'

/**
 * Tiptap Node extension that embeds a diagram (mindmap or flowchart)
 * as a block inside the document.
 */
export const DiagramExtension = Node.create({
  name: 'diagram',
  group: 'block',
  atom: true,       // treat as single unit (not editable inline)
  draggable: true,

  addAttributes() {
    return {
      diagramId:   { default: null },
      diagramType: { default: 'mindmap' },  // 'mindmap' | 'flowchart'
      data:        { default: JSON.stringify({ nodes: [], edges: [] }) },
      height:      { default: 400 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-diagram]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-diagram': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramNodeView)
  },
})
