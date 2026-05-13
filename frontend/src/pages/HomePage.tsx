import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Trash2, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'

interface Doc { id: string; title: string; updatedAt: string; isPublic: boolean }

export default function HomePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listDocuments().then((r) => { setDocs(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const createDoc = async () => {
    const res = await api.createDocument({ title: 'Untitled' })
    navigate(`/editor/${res.data.id}`)
  }

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this document?')) return
    await api.deleteDocument(id)
    setDocs((d) => d.filter((x) => x.id !== id))
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-surface-bg">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-8">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#01696f"/>
            <circle cx="16" cy="10" r="4" fill="white"/>
            <circle cx="8" cy="22" r="3" fill="white" opacity="0.8"/>
            <circle cx="24" cy="22" r="3" fill="white" opacity="0.8"/>
            <line x1="16" y1="14" x2="8" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
            <line x1="16" y1="14" x2="24" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          </svg>
          <span className="font-semibold text-gray-900">FlowMind</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <button onClick={createDoc} className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors">
            <Plus size={14} /> New Document
          </button>
        </nav>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-800 truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 truncate mb-2">{user?.email}</p>
          <button onClick={() => { logout(); navigate('/login') }} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Documents</h1>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
              <FileText size={28} className="text-primary" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">No documents yet</h2>
            <p className="text-sm text-gray-500 mb-4">Create your first document to get started</p>
            <button onClick={createDoc} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors">
              <Plus size={14} /> New Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/editor/${doc.id}`)}
                className="group relative bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-offset flex items-center justify-center">
                    <FileText size={15} className="text-primary" />
                  </div>
                  <button
                    onClick={(e) => deleteDoc(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <h3 className="font-medium text-gray-900 text-sm truncate mb-1">{doc.title || 'Untitled'}</h3>
                <p className="text-xs text-gray-400">{fmt(doc.updatedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
