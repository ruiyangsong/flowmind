import React, { useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { GitBranch, Network, Pencil, Copy, Trash2 } from 'lucide-react'
import MindMap from './MindMap'
import Flowchart from './Flowchart'
import type { DiagramData } from '@flowmind/shared'

export default function DiagramBlock({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const [editing, setEditing] = useState(false)
  const diagramData: DiagramData = node.attrs.diagramData
  const type = diagramData.type

  const handleChange = (updated: DiagramData) => {
    updateAttributes({ diagramData: updated })
  }

  const handleCopy = () => {
    const json = editor.getJSON()
    // Insert a duplicate after current node
    editor.commands.insertContentAt(
      editor.state.selection.to,
      { type: 'diagramBlock', attrs: { diagramData: { ...diagramData, id: crypto.randomUUID() } } }
    )
  }

  return (
    <NodeViewWrapper className="diagram-block" data-drag-handle="">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          {type === 'mindmap' ? <Network size={13} /> : <GitBranch size={13} />}
          {type === 'mindmap' ? 'Mind Map' : 'Flowchart'}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setEditing(!editing)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            title={editing ? 'Done editing' : 'Edit diagram'}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            title="Duplicate"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={deleteNode}
            className="p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      {type === 'mindmap' ? (
        <MindMap data={diagramData} readonly={!editing} onChange={editing ? handleChange : undefined} />
      ) : (
        <Flowchart data={diagramData} readonly={!editing} onChange={editing ? handleChange : undefined} />
      )}
    </NodeViewWrapper>
  )
}
