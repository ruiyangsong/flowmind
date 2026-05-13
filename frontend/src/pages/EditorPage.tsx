import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, Check, Copy, Download, FileText, Printer } from 'lucide-react'
import DocumentEditor, { type EditorHandle } from '@/components/editor/DocumentEditor'
import SaveIndicator from '@/components/editor/SaveIndicator'
import { api } from '@/lib/api'
import { getLocalDoc, saveLocalDoc } from '@/lib/db'
import { useSaveStatus } from '@/stores/saveStatus'
import { toMarkdown, downloadMarkdown, printToPdf } from '@/lib/exporter'

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const editorRef = useRef<EditorHandle>(null)
  const [doc, setDoc] = useState<{ id: string; title: string; content: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [shareMode, setShareMode] = useState<'readonly' | 'collab'>('readonly')
  const markSaved = useSaveStatus((s) => s.markSaved)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const local = await getLocalDoc(id)
      if (local) {
        setDoc({ id: local.id, title: local.title, content: local.content })
        setLoading(false)
      }
      try {
        const remote = await api.getDocument(id)
        const d = remote.data
        setDoc({ id: d.id, title: d.title, content: d.content })
        const now = new Date().toISOString()
        await saveLocalDoc({ id: d.id, title: d.title, content: d.content, updatedAt: now, synced: true })
        markSaved()
      } catch { /* offline — use local */ }
      setLoading(false)
    }
    load()
  }, [id, markSaved])

  const handleTitleChange = useCallback(async (title: string) => {
    if (!doc) return
    setDoc((d) => d ? { ...d, title } : null)
    const now = new Date().toISOString()
    await saveLocalDoc({ id: doc.id, title, content: doc.content, updatedAt: now, synced: false })
    try { await api.updateDocument(doc.id, { title }); markSaved() } catch { /* offline */ }
  }, [doc, markSaved])

  const createShare = async () => {
    if (!id) return
    try {
      const res = await api.createShareToken(id, { mode: shareMode, expiresIn: '30d' })
      // Server returns a path like `/share/...`; turn into a fully-qualified URL.
      const url = res.data.shareUrl.startsWith('http')
        ? res.data.shareUrl
        : window.location.origin + res.data.shareUrl
      setShareUrl(url)
    } catch (e: any) { alert(e.message) }
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportPdf = () => {
    const editor = editorRef.current?.getEditor()
    if (!editor || !doc) return
    printToPdf(editor, doc.title)
    setExportOpen(false)
  }

  const exportMarkdown = () => {
    const editor = editorRef.current?.getEditor()
    if (!editor || !doc) return
    downloadMarkdown(toMarkdown(editor, doc.title), doc.title)
    setExportOpen(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!doc) return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center">
      <p className="text-gray-500">Document not found.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col">
      {/* Top bar */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-3">
          <SaveIndicator />
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-full hover:border-primary hover:text-primary transition-colors"
            title="Export document"
          >
            <Download size={12} /> Export
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary-light rounded-full hover:bg-primary-light transition-colors"
          >
            <Share2 size={12} /> Share
          </button>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-6">
        <DocumentEditor
          ref={editorRef}
          docId={doc.id}
          title={doc.title}
          initialContent={doc.content}
          onTitleChange={handleTitleChange}
        />
      </div>

      {/* Share modal */}
      {shareOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShareOpen(false)}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 mb-4">Share document</h2>
            <div className="flex gap-2 mb-4">
              {(['readonly', 'collab'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setShareMode(m)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    shareMode === m ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'
                  }`}
                >
                  {m === 'readonly' ? 'Read only' : 'Collaborative'}
                </button>
              ))}
            </div>
            {!shareUrl ? (
              <button onClick={createShare} className="w-full py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors">
                Generate link
              </button>
            ) : (
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg bg-surface-offset text-gray-700" />
                <button onClick={copyUrl} className="p-2 border border-gray-200 rounded-lg hover:bg-surface-offset transition-colors">
                  {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-gray-500" />}
                </button>
              </div>
            )}
            <button onClick={() => { setShareOpen(false); setShareUrl('') }} className="w-full mt-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Export modal */}
      {exportOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setExportOpen(false)}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 mb-4">Export document</h2>
            <div className="flex flex-col gap-2">
              <button onClick={exportPdf} className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-light/40 transition-colors text-left">
                <Printer size={16} className="text-primary" />
                <div>
                  <div className="text-sm font-medium text-gray-900">PDF</div>
                  <div className="text-xs text-gray-500">Open print dialog · Save as PDF</div>
                </div>
              </button>
              <button onClick={exportMarkdown} className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-light/40 transition-colors text-left">
                <FileText size={16} className="text-primary" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Markdown</div>
                  <div className="text-xs text-gray-500">Download .md file</div>
                </div>
              </button>
            </div>
            <button onClick={() => setExportOpen(false)} className="w-full mt-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
