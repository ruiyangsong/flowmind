import React from 'react'
import { type Editor } from '@tiptap/react'
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2,
  List, ListOrdered, CheckSquare, Quote, Minus,
  Network, GitBranch, Undo2, Redo2
} from 'lucide-react'
import { createDiagram } from '@/components/diagram/diagramExtension'

interface Props { editor: Editor }

function Btn({ onClick, active, title, children }: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />
}

export default function Toolbar({ editor }: Props) {
  const insertDiagram = (type: 'mindmap' | 'flowchart') => {
    const data = createDiagram(type)
    editor.chain().focus().insertContent({ type: 'diagramBlock', attrs: { diagramData: data } }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-white sticky top-0 z-20">
      <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo">
        <Undo2 size={15} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo">
        <Redo2 size={15} />
      </Btn>
      <Divider />
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
        <Bold size={15} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
        <Italic size={15} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough size={15} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
        <Code size={15} />
      </Btn>
      <Divider />
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1">
        <Heading1 size={15} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2">
        <Heading2 size={15} />
      </Btn>
      <Divider />
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
        <List size={15} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
        <ListOrdered size={15} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Task list">
        <CheckSquare size={15} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
        <Quote size={15} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
        <Minus size={15} />
      </Btn>
      <Divider />
      <button
        onMouseDown={(e) => { e.preventDefault(); insertDiagram('mindmap') }}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary border border-primary-light hover:bg-primary-light transition-colors"
        title="Insert Mind Map"
      >
        <Network size={13} /> Mind Map
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); insertDiagram('flowchart') }}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary border border-primary-light hover:bg-primary-light transition-colors"
        title="Insert Flowchart"
      >
        <GitBranch size={13} /> Flowchart
      </button>
    </div>
  )
}
