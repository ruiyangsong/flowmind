import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { DiagramExtension } from '@/components/diagram/diagramExtension'
import Toolbar from './Toolbar'
import { saveLocalDoc } from '@/lib/db'
import { api, ApiError } from '@/lib/api'
import { useSaveStatus } from '@/stores/saveStatus'

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: { depth: 100 } }),
      Placeholder.configure({ placeholder: 'Start writing, or type / to insert…' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      DiagramExtension,
    ],
    content: (() => { try { return JSON.parse(initialContent) } catch { return initialContent || '' } })(),
    editable: !readonly,
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

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {!readonly && editor && <Toolbar editor={editor} />}
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
