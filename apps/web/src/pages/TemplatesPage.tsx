import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Network, GitBranch, FileText } from 'lucide-react'
import { api } from '@/lib/api'

const TEMPLATES = [
  {
    id: 'blank',
    title: 'Blank Document',
    description: 'Start from scratch with an empty document',
    icon: FileText,
    color: 'bg-gray-100 text-gray-600',
    content: '{}',
  },
  {
    id: 'mindmap',
    title: 'Mind Map',
    description: 'Visual brainstorming with a mind map',
    icon: Network,
    color: 'bg-primary-light text-primary',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Mind Map' }] },
        {
          type: 'diagramBlock',
          attrs: {
            diagramData: {
              id: 'tpl-mm',
              type: 'mindmap',
              nodes: [
                { id: '1', label: 'Main Topic', x: 200, y: 150 },
                { id: '2', label: 'Branch A', x: 400, y: 80 },
                { id: '3', label: 'Branch B', x: 400, y: 220 },
                { id: '4', label: 'Branch C', x: 0, y: 150 },
              ],
              edges: [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e1-3', source: '1', target: '3' },
                { id: 'e1-4', source: '1', target: '4' },
              ],
            },
          },
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Add your notes here…' }] },
      ],
    }),
  },
  {
    id: 'flowchart',
    title: 'Flowchart',
    description: 'Map out processes and decision trees',
    icon: GitBranch,
    color: 'bg-yellow-50 text-yellow-700',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Flowchart' }] },
        {
          type: 'diagramBlock',
          attrs: {
            diagramData: {
              id: 'tpl-fc',
              type: 'flowchart',
              nodes: [
                { id: '1', label: 'Start', type: 'start', x: 200, y: 30 },
                { id: '2', label: 'Process', type: 'process', x: 200, y: 140 },
                { id: '3', label: 'Decision?', type: 'decision', x: 200, y: 250 },
                { id: '4', label: 'End', type: 'end', x: 200, y: 360 },
              ],
              edges: [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3' },
                { id: 'e3-4', source: '3', target: '4' },
              ],
            },
          },
        },
      ],
    }),
  },
]

export default function TemplatesPage() {
  const navigate = useNavigate()

  const useTemplate = async (tpl: typeof TEMPLATES[0]) => {
    const res = await api.createDocument({ title: tpl.title, content: tpl.content })
    navigate(`/editor/${res.data.id}`)
  }

  return (
    <div className="min-h-screen bg-surface-bg p-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Templates</h1>
      <p className="text-sm text-gray-500 mb-8">Start faster with a pre-built template</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => useTemplate(tpl)}
            className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-primary hover:shadow-sm transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl ${tpl.color} flex items-center justify-center mb-3`}>
              <tpl.icon size={18} />
            </div>
            <h3 className="font-medium text-gray-900 mb-1 group-hover:text-primary transition-colors">{tpl.title}</h3>
            <p className="text-xs text-gray-500">{tpl.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
