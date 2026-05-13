import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Lazy-load every page to keep first-paint bundle tiny.
const HomePage     = lazy(() => import('@/pages/HomePage'))
const EditorPage   = lazy(() => import('@/pages/EditorPage'))
const SharePage    = lazy(() => import('@/pages/SharePage'))
const LoginPage    = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-bg">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate)
  useEffect(() => { hydrate() }, [hydrate])

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/collab/:token" element={<SharePage collab />} />
        <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/editor/:id" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
        {/* Backwards-compat alias for any pre-0.2 links */}
        <Route path="/doc/:id" element={<Navigate to="/editor/:id" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
