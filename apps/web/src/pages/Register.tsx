import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, password, name)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#01696f"/>
              <circle cx="16" cy="10" r="4" fill="white"/>
              <circle cx="8" cy="22" r="3" fill="white" opacity="0.8"/>
              <circle cx="24" cy="22" r="3" fill="white" opacity="0.8"/>
              <line x1="16" y1="14" x2="8" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
              <line x1="16" y1="14" x2="24" y2="19" stroke="white" strokeWidth="1.5" opacity="0.6"/>
            </svg>
            <span className="text-xl font-semibold text-gray-800">FlowMind</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 mt-1 text-sm">Start building your mind maps & flows</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#d4d1ca] p-6 shadow-sm space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 border border-red-100">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text" required autoFocus
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#d4d1ca] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f] transition"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#d4d1ca] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f] transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#d4d1ca] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f] transition"
              placeholder="Min. 6 characters"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#01696f] hover:bg-[#0c4e54] text-white font-medium rounded-lg py-2.5 text-sm transition disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-[#01696f] hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
