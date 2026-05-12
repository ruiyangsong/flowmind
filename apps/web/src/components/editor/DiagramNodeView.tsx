import { NodeViewWrapper } from '@tiptap/react'
import { useState, useCallback } from 'react'
import { GitBranch, Workflow, Maximize2, Minimize2, Copy, Trash2 } from 'lucide-react'
import MindMapCanvas from '../mindmap/MindMapCanvas'
import FlowchartCanvas from '../flowchart/FlowchartCanvas'
import type { DiagramData } from '@flowmind/shared'
import { nanoid } from 'nanoid'

interface Props {
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
  deleteNode: () => void
  editor: any
}

export default function DiagramNodeView({ node, updateAttributes, deleteNode, editor }: Props) {
  const { diagramType, data, height, diagramId } = node.attrs
  const [expanded, setExpanded] = useState(false)
  const parsedData: DiagramData = (() => { try { return JSON.parse(data) } catch { return { id: diagramId, type: diagramType, nodes: [], edges: [] } } })()

  const handleDataChange = useCallback((newData: DiagramData) => {
    updateAttributes({ data: JSON.stringify(newData) })
  }, [updateAttributes])

  const handleCopy = useCallback(() => {
    const newId = nanoid()
    editor.chain().focus().insertContent({
      type: 'diagram',
      attrs: { ...node.attrs, diagramId: newId },
    }).run()
  }, [editor, node.attrs])

  const canvasHeight = expanded ? 600 : height

  return (
    <NodeViewWrapper>
      <div
        className="my-4 rounded-xl border border-[#d4d1ca] overflow-hidden bg-white"
        style={{ userSelect: 'none' }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#d4d1ca] bg-[#f9f8f5]">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            {diagramType === 'mindmap'
              ? <GitBranch size={13} className="text-[#01696f]" />
              : <Workflow size={13} className="text-[#01696f]" />}
            <span className="font-medium text-gray-700 capitalize">{diagramType}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title="Copy">
              <Copy size={13} />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title={expanded ? 'Collapse' : 'Expand'}>
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button onClick={deleteNode} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ height: canvasHeight }}>
          {diagramType === 'mindmap' ? (
            <MindMapCanvas data={parsedData} onChange={handleDataChange} readonly={!editor.isEditable} />
          ) : (
            <FlowchartCanvas data={parsedData} onChange={handleDataChange} readonly={!editor.isEditable} />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
