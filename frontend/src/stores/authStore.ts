import { create } from 'zustand'
import { api } from '@/lib/api'

export interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
  createdAt: string
}

interface AuthState {
  user: UserProfile | null
  token: string | null
  isLoading: boolean
  hydrated: boolean
  login:  (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('fm_token'),
  isLoading: false,
  hydrated: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const res = await api.login({ email, password })
      localStorage.setItem('fm_token', res.token)
      set({ user: res.user, token: res.token, isLoading: false, hydrated: true })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true })
    try {
      const res = await api.register({ email, password, name })
      localStorage.setItem('fm_token', res.token)
      set({ user: res.user, token: res.token, isLoading: false, hydrated: true })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  logout: () => {
    localStorage.removeItem('fm_token')
    set({ user: null, token: null })
  },

  hydrate: async () => {
    const token = localStorage.getItem('fm_token')
    if (!token) { set({ hydrated: true }); return }
    try {
      const res = await api.me()
      set({ user: res.data, token, hydrated: true })
    } catch {
      localStorage.removeItem('fm_token')
      set({ user: null, token: null, hydrated: true })
    }
  },
}))
