import { Check, CloudOff, Loader2, RefreshCw } from 'lucide-react'
import { useSaveStatus } from '@/stores/saveStatus'

const LABELS = {
  saved:    { icon: Check,      text: 'Saved',    cls: 'text-green-600' },
  saving:   { icon: Loader2,    text: 'Saving…',  cls: 'text-gray-500 animate-spin-icon' },
  offline:  { icon: CloudOff,   text: 'Offline',  cls: 'text-amber-600' },
  unsynced: { icon: RefreshCw,  text: 'Unsynced', cls: 'text-amber-600' },
} as const

export default function SaveIndicator() {
  const status = useSaveStatus((s) => s.status)
  const last   = useSaveStatus((s) => s.lastSavedAt)
  const cfg    = LABELS[status]
  const Icon   = cfg.icon

  let suffix = ''
  if (status === 'saved' && last) {
    const sec = Math.floor((Date.now() - last) / 1000)
    if (sec < 5)        suffix = ''
    else if (sec < 60)  suffix = ` · ${sec}s ago`
    else if (sec < 3600) suffix = ` · ${Math.floor(sec/60)}m ago`
  }

  const Spinning = status === 'saving' ? { animation: 'spin 1s linear infinite' } : undefined

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.cls}`} title={`Auto-save: ${cfg.text}`}>
      <Icon size={13} style={Spinning} />
      <span>{cfg.text}{suffix}</span>
    </div>
  )
}
