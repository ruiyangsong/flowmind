import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import DocumentEditor from '@/components/editor/DocumentEditor'
import { api } from '@/lib/api'

export default function SharePage({ collab = false }: { collab?: boolean } = {}) {
  const { token } = useParams<{ token: string }>()
  void collab // collab CRDT sync is wired through the share token mode; this prop just marks the route.
  const [data, setData] = useState<{ documentId: string; title: string; content: string; mode: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    api.resolveShareToken(token)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
  }, [token])

  if (error) return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-900 font-medium mb-1">Link unavailable</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col">
      <header className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#01696f"/>
            <circle cx="16" cy="10" r="4" fill="white"/>
            <circle cx="8" cy="22" r="3" fill="white" opacity="0.8"/>
            <circle cx="24" cy="22" r="3" fill="white" opacity="0.8"/>
            <line x1="16" y1="14" x2="8" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
            <line x1="16" y1="14" x2="24" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          </svg>
          <span className="text-sm font-medium text-gray-700">FlowMind</span>
        </div>
        <span className="ml-3 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {data.mode === 'readonly' ? 'Read only' : 'Collaborative'}
        </span>
      </header>
      <div className="flex-1 max-w-4xl w-full mx-auto p-6">
        <DocumentEditor
          docId={data.documentId}
          title={data.title}
          initialContent={data.content}
          readonly={data.mode === 'readonly'}
        />
      </div>
    </div>
  )
}
