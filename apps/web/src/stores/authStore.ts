import { create } from 'zustand'
import { api } from '../lib/api'

interface AuthState {
  token: string | null
  user: { id: string; email: string; name: string } | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('fm_token'),
  user: null,

  hydrate: async () => {
    const token = localStorage.getItem('fm_token')
    if (!token) return
    try {
      const res = await api.me()
      set({ token, user: res.data })
    } catch {
      localStorage.removeItem('fm_token')
      set({ token: null, user: null })
    }
  },

  login: async (email, password) => {
    const res = await api.login(email, password)
    localStorage.setItem('fm_token', res.token)
    set({ token: res.token, user: res.user })
  },

  register: async (email, password, name) => {
    const res = await api.register(email, password, name)
    localStorage.setItem('fm_token', res.token)
    set({ token: res.token, user: res.user })
  },

  logout: () => {
    localStorage.removeItem('fm_token')
    set({ token: null, user: null })
  },
}))
