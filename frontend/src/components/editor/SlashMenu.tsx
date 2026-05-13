import { useEffect, useRef, useState } from 'react'
import { GitBranch, Workflow, Heading1, Heading2, List, ListOrdered, CheckSquare, Code, Quote, Image as ImageIcon } from 'lucide-react'
import { nanoid } from 'nanoid'
import { uploadFile, isImageFile } from '@/lib/uploads'

interface MenuItem {
  icon: React.ReactNode
  label: string
  description: string
  action: (editor: any) => void
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon: <GitBranch size={16} className="text-[#01696f]" />,
    label: 'Mind Map',
    description: 'Insert a mind map canvas',
    action: (editor) => {
      const id = nanoid()
      const defaultData = JSON.stringify({
        id, type: 'mindmap',
        nodes: [{ id: 'root', label: 'Central Idea', x: 300, y: 200 }],
        edges: [],
      })
      editor.chain().focus().deleteRange(editor.state.selection).insertContent({
        type: 'diagram',
        attrs: { diagramId: id, diagramType: 'mindmap', data: defaultData, height: 400 },
      }).run()
    },
  },
  {
    icon: <Workflow size={16} className="text-[#01696f]" />,
    label: 'Flowchart',
    description: 'Insert a flowchart canvas',
    action: (editor) => {
      const id = nanoid()
      const defaultData = JSON.stringify({
        id, type: 'flowchart',
        nodes: [
          { id: '1', label: 'Start', type: 'start', x: 250, y: 80 },
          { id: '2', label: 'Process', type: 'process', x: 250, y: 200 },
          { id: '3', label: 'End', type: 'end', x: 250, y: 320 },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
        ],
      })
      editor.chain().focus().deleteRange(editor.state.selection).insertContent({
        type: 'diagram',
        attrs: { diagramId: id, diagramType: 'flowchart', data: defaultData, height: 400 },
      }).run()
    },
  },
  {
    icon: <ImageIcon size={16} className="text-[#01696f]" />,
    label: 'Image',
    description: 'Upload and insert an image',
    action: (editor) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file || !isImageFile(file)) return
        try {
          const up = await uploadFile(file)
          editor.chain().focus().deleteRange(editor.state.selection).setImage({ src: up.url, alt: up.originalName }).run()
        } catch (e: any) {
          alert(`Upload failed: ${e?.message ?? 'unknown error'}`)
        }
      }
      input.click()
    },
  },
  { icon: <Heading1 size={16} />, label: 'Heading 1', description: 'Large section heading', action: (e) => e.chain().focus().deleteRange(e.state.selection).toggleHeading({ level: 1 }).run() },
  { icon: <Heading2 size={16} />, label: 'Heading 2', description: 'Medium section heading', action: (e) => e.chain().focus().deleteRange(e.state.selection).toggleHeading({ level: 2 }).run() },
  { icon: <List size={16} />, label: 'Bullet List', description: 'Unordered list', action: (e) => e.chain().focus().deleteRange(e.state.selection).toggleBulletList().run() },
  { icon: <ListOrdered size={16} />, label: 'Numbered List', description: 'Ordered list', action: (e) => e.chain().focus().deleteRange(e.state.selection).toggleOrderedList().run() },
  { icon: <CheckSquare size={16} />, label: 'Task List', description: 'Checklist', action: (e) => e.chain().focus().deleteRange(e.state.selection).toggleTaskList().run() },
  { icon: <Code size={16} />, label: 'Code Block', description: 'Code snippet', action: (e) => e.chain().focus().deleteRange(e.state.selection).toggleCodeBlock().run() },
  { icon: <Quote size={16} />, label: 'Blockquote', description: 'Quote block', action: (e) => e.chain().focus().deleteRange(e.state.selection).toggleBlockquote().run() },
]

export default function SlashMenu({ editor, onClose }: { editor: any; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = MENU_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % filtered.length) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length) }
      if (e.key === 'Enter')     { e.preventDefault(); filtered[activeIdx]?.action(editor); onClose() }
      if (e.key === 'Escape')    onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filtered, activeIdx, editor, onClose])

  return (
    <div ref={ref} className="absolute z-50 w-64 bg-white rounded-xl border border-[#d4d1ca] shadow-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-[#d4d1ca]">
        <input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
          placeholder="Search blocks…"
          className="w-full text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-400 text-center">No results</div>
        ) : (
          filtered.map((item, i) => (
            <button
              key={item.label}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => { item.action(editor); onClose() }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition ${
                i === activeIdx ? 'bg-[#f3f0ec]' : ''
              }`}
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-md bg-[#f3f0ec] text-gray-600 flex-shrink-0">{item.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-400">{item.description}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
