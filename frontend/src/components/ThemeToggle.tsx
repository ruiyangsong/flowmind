import { useEffect, useState } from 'react'
import { Moon, Sun, MonitorSmartphone } from 'lucide-react'
import { getTheme, setTheme, type Theme } from '@/lib/theme'

export default function ThemeToggle() {
  const [t, setT] = useState<Theme>('auto')
  useEffect(() => {
    setT(getTheme())
    const on = (e: Event) => setT((e as CustomEvent<Theme>).detail || 'auto')
    window.addEventListener('fm-theme-change', on as EventListener)
    return () => window.removeEventListener('fm-theme-change', on as EventListener)
  }, [])

  const cycle = () => {
    const next: Theme = t === 'light' ? 'dark' : t === 'dark' ? 'auto' : 'light'
    setTheme(next)
    setT(next)
  }

  const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : MonitorSmartphone
  const title = `Theme: ${t} (click to change)`

  return (
    <button
      onClick={cycle}
      title={title}
      aria-label={title}
      style={{
        width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', color: 'var(--text-soft)',
        border: '1px solid var(--border)', borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      <Icon size={16} />
    </button>
  )
}
