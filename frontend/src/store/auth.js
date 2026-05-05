// src/store/auth.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:  null,
      token: null,
      login: async (email, password) => {
        const { data } = await api.post('/auth/token', { email, password })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        set({ user: data.user, token: data.token })
        return data.user
      },
      register: async (email, name, password, language = 'en') => {
        const { data } = await api.post('/auth/register', { email, name, password, language })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        set({ user: data.user, token: data.token })
        return data.user
      },
      logout: () => {
        delete api.defaults.headers.common['Authorization']
        set({ user: null, token: null })
      },
      updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),
      hydrate: () => {
        const { token } = get()
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      },
    }),
    { name: 'prism-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)
