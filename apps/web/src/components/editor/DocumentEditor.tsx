import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { DiagramExtension } from './DiagramExtension'
import { useState, useEffect, useRef, useCallback } from 'react'
import SlashMenu from './SlashMenu'
import ShareModal from '../share/ShareModal'
import { Bold, Italic, Code, Share2, Download } from 'lucide-react'

interface Props {
  docId: string
  title: string
  content: string
  onTitleChange: (t: string) => void
  onContentChange: (c: string) => void
  readonly?: boolean
}

export default function DocumentEditor({ docId, title, content, onTitleChange, onContentChange, readonly = false }: Props) {
  const [showSlash, setShowSlash] = useState(false)
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 })
  const [showShare, setShowShare] = useState(false)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write something, or type / for commands…' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      DiagramExtension,
    ],
    editable: !readonly,
    content: (() => { try { return JSON.parse(content) } catch { return content || '' } })(),
    onUpdate: ({ editor }) => {
      onContentChange(JSON.stringify(editor.getJSON()))
    },
    onKeyDown: ({ event }) => {
      if (event.key === '/' && !showSlash) {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          const containerRect = editorContainerRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 }
          setSlashPos({ top: rect.bottom - containerRect.top + 8, left: rect.left - containerRect.left })
          setShowSlash(true)
        }
      }
      return false
    },
  })

  // Close slash menu on outside click
  useEffect(() => {
    if (!showSlash) return
    const handler = () => setShowSlash(false)
    setTimeout(() => window.addEventListener('click', handler), 50)
    return () => window.removeEventListener('click', handler)
  }, [showSlash])

  const handleExport = useCallback(() => {
    if (!editor) return
    const json = editor.getJSON()
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title || 'document'}.flowmind.json`
    a.click()
  }, [editor, title])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {!readonly && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#d4d1ca] bg-white">
          <div className="flex items-center gap-1">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded text-sm transition ${ editor?.isActive('bold') ? 'bg-[#cedcd8] text-[#01696f]' : 'hover:bg-gray-100 text-gray-500'}`}
            ><Bold size={15} /></button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded text-sm transition ${ editor?.isActive('italic') ? 'bg-[#cedcd8] text-[#01696f]' : 'hover:bg-gray-100 text-gray-500'}`}
            ><Italic size={15} /></button>
            <button
              onClick={() => editor?.chain().focus().toggleCode().run()}
              className={`p-1.5 rounded text-sm transition ${ editor?.isActive('code') ? 'bg-[#cedcd8] text-[#01696f]' : 'hover:bg-gray-100 text-gray-500'}`}
            ><Code size={15} /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 bg-[#01696f] hover:bg-[#0c4e54] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="px-8 pt-10 pb-2 max-w-[800px] mx-auto w-full">
        {readonly ? (
          <h1 className="text-4xl font-bold text-gray-900">{title}</h1>
        ) : (
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full text-4xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-200"
          />
        )}
      </div>

      {/* Editor */}
      <div ref={editorContainerRef} className="flex-1 overflow-y-auto relative">
        <EditorContent editor={editor} className="min-h-full" />
        {showSlash && editor && (
          <div style={{ position: 'absolute', top: slashPos.top, left: slashPos.left }}>
            <SlashMenu editor={editor} onClose={() => setShowSlash(false)} />
          </div>
        )}
      </div>

      {showShare && <ShareModal docId={docId} onClose={() => setShowShare(false)} />}
    </div>
  )
}
