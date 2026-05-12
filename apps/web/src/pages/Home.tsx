import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, FileText, LogOut, Trash2, Clock } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, logout, hydrate } = useAuthStore()
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    hydrate()
    fetchDocs()
  }, [])

  async function fetchDocs() {
    try {
      const res = await api.listDocs()
      setDocs(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function createDoc() {
    setCreating(true)
    try {
      const res = await api.createDoc('Untitled')
      navigate(`/doc/${res.data.id}`)
    } catch { setCreating(false) }
  }

  async function deleteDoc(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this document?')) return
    await api.deleteDoc(id)
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      {/* Header */}
      <header className="bg-white border-b border-[#d4d1ca] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#01696f"/>
            <circle cx="16" cy="10" r="4" fill="white"/>
            <circle cx="8" cy="22" r="3" fill="white" opacity="0.8"/>
            <circle cx="24" cy="22" r="3" fill="white" opacity="0.8"/>
            <line x1="16" y1="14" x2="8" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
            <line x1="16" y1="14" x2="24" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          </svg>
          <span className="font-semibold text-gray-800">FlowMind</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.name ?? user?.email}</span>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600 transition" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
            <p className="text-sm text-gray-500 mt-0.5">Mind maps, flowcharts & notes — all in one place</p>
          </div>
          <button
            onClick={createDoc} disabled={creating}
            className="flex items-center gap-2 bg-[#01696f] hover:bg-[#0c4e54] text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <FilePlus size={16} />
            {creating ? 'Creating…' : 'New Document'}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#d4d1ca] p-5 h-28 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No documents yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first document to get started</p>
            <button
              onClick={createDoc}
              className="bg-[#01696f] hover:bg-[#0c4e54] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              Create Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/doc/${doc.id}`)}
                className="group bg-white rounded-xl border border-[#d4d1ca] p-5 cursor-pointer hover:shadow-md hover:border-[#01696f]/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-gray-800 truncate flex-1 pr-2">{doc.title || 'Untitled'}</h3>
                  <button
                    onClick={(e) => deleteDoc(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                  <Clock size={12} />
                  <span>{formatDate(doc.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
