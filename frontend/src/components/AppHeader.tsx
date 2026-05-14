import { Link } from 'react-router-dom'
import { Brain } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
}

export default function AppHeader({ left, center, right }: Props) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  return (
    <header
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 14px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border-soft)',
        height: 48,
        flexShrink: 0,
      }}
    >
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text)', textDecoration: 'none' }}>
        <Brain size={18} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>MindForge</span>
      </Link>
      <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        {left}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {center}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        <ThemeToggle />
        {user && (
          <button
            onClick={logout}
            title={`Sign out (${user.email})`}
            style={{
              fontSize: 12, padding: '6px 10px',
              background: 'transparent', color: 'var(--text-soft)',
              border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  )
}
