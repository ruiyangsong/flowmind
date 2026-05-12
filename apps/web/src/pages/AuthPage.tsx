import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, name)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-8">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#01696f"/>
            <circle cx="16" cy="10" r="4" fill="white"/>
            <circle cx="8" cy="22" r="3" fill="white" opacity="0.8"/>
            <circle cx="24" cy="22" r="3" fill="white" opacity="0.8"/>
            <line x1="16" y1="14" x2="8" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
            <line x1="16" y1="14" x2="24" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          </svg>
          <span className="font-semibold text-lg text-gray-900">FlowMind</span>
        </div>
        <h1 className="text-xl font-semibold mb-1">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="text-sm text-gray-500 mb-6">{mode === 'login' ? 'Sign in to your workspace' : 'Start for free, no credit card needed'}</p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary transition-colors"
            />
          )}
          <input
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary transition-colors"
          />
          <input
            type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary transition-colors"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-500 mt-4">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-primary hover:underline">
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
