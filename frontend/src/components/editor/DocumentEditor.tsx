import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { DiagramExtension } from '@/components/diagram/diagramExtension'
import { FlowMindImage } from './imageExtension'
import Toolbar from './Toolbar'
import SlashMenu from './SlashMenu'
import { saveLocalDoc } from '@/lib/db'
import { api, ApiError } from '@/lib/api'
import { useSaveStatus } from '@/stores/saveStatus'
import { uploadFile, isImageFile } from '@/lib/uploads'

interface Props {
  docId: string
  title: string
  initialContent: string
  readonly?: boolean
  onTitleChange?: (t: string) => void
}

export interface EditorHandle {
  getEditor: () => Editor | null
}

const DocumentEditor = forwardRef<EditorHandle, Props>(function DocumentEditor(
  { docId, title, initialContent, readonly = false, onTitleChange }, ref
) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setStatus = useSaveStatus((s) => s.set)
  const markSaved = useSaveStatus((s) => s.markSaved)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashPos, setSlashPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const slashOpenRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: { depth: 100 } }),
      Placeholder.configure({ placeholder: 'Start writing, or type / to insert…' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      DiagramExtension,
      FlowMindImage,
    ],
    content: (() => { try { return JSON.parse(initialContent) } catch { return initialContent || '' } })(),
    editable: !readonly,
    editorProps: {
      handleKeyDown: (view, event) => {
        if (readonly) return false
        if (event.key === '/' && !slashOpenRef.current) {
          // Use ProseMirror's coordsAtPos — always returns correct viewport coords.
          try {
            const { from } = view.state.selection
            const coords = view.coordsAtPos(from)
            const MENU_H = 340
            const MENU_W = 256
            const PAD = 10
            const vh = window.innerHeight
            const vw = window.innerWidth
            const flipUp = coords.bottom + MENU_H + PAD > vh
            const top = flipUp
              ? Math.max(PAD, coords.top - MENU_H - 6)
              : coords.bottom + 6
            const left = Math.min(
              Math.max(PAD, coords.left),
              vw - MENU_W - PAD
            )
            setSlashPos({ top, left })
          } catch {
            setSlashPos({ top: 100, left: 100 })
          }
          slashOpenRef.current = true
          setSlashOpen(true)
          // Don't insert the "/" character — the menu replaces that affordance.
          event.preventDefault()
          return true
        }
        return false
      },
      handlePaste: (view, event) => {
        if (readonly) return false
        const files = Array.from(event.clipboardData?.files ?? []).filter(isImageFile)
        if (files.length === 0) return false
        event.preventDefault()
        void handleFiles(files)
        return true
      },
      handleDrop: (view, event) => {
        if (readonly) return false
        const dt = (event as DragEvent).dataTransfer
        const files = Array.from(dt?.files ?? []).filter(isImageFile)
        if (files.length === 0) return false
        event.preventDefault()
        void handleFiles(files)
        return true
      },
    },
    onUpdate: ({ editor }) => {
      if (readonly) return
      const content = JSON.stringify(editor.getJSON())
      setStatus('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const now = new Date().toISOString()
        try {
          await saveLocalDoc({ id: docId, title, content, updatedAt: now, synced: false })
          if (!navigator.onLine) { setStatus('offline'); return }
          await api.updateDocument(docId, { content })
          await saveLocalDoc({ id: docId, title, content, updatedAt: now, synced: true })
          markSaved()
        } catch (e) {
          if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) setStatus('offline')
          else setStatus('unsynced')
        }
      }, 800)
    },
  })

  useImperativeHandle(ref, () => ({ getEditor: () => editor }), [editor])
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  async function handleFiles(files: File[]) {
    if (!editor) return
    for (const f of files) {
      try {
        const up = await uploadFile(f)
        editor.chain().focus().setImage({ src: up.url, alt: up.originalName }).run()
      } catch (e: any) {
        console.error('[flowmind] upload failed', e)
        alert(`Upload failed: ${e?.message ?? 'unknown error'}`)
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {!readonly && editor && <Toolbar editor={editor} />}
      {slashOpen && editor && (
        <div className="fixed z-50" style={{ top: slashPos.top, left: slashPos.left }}>
          <SlashMenu editor={editor} onClose={() => { slashOpenRef.current = false; setSlashOpen(false); editor.commands.focus() }} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        {!readonly ? (
          <input
            className="w-full text-3xl font-bold text-gray-900 outline-none mb-6 placeholder:text-gray-300"
            value={title}
            onChange={(e) => onTitleChange?.(e.target.value)}
            placeholder="Untitled"
          />
        ) : (
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{title}</h1>
        )}
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  )
})

export default DocumentEditor
