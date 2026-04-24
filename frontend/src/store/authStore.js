import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,

      setAuth: ({ token, refreshToken, user }) => set({ token, refreshToken, user }),
      setToken: (token) => set({ token }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
      updateUser: (user) => set({ user: { ...get().user, ...user } }),

      isAdmin: () => get().user?.role === 'ADMIN',
      isManager: () => ['ADMIN', 'MANAGER'].includes(get().user?.role),
    }),
    {
      name: 'pharmacy-auth',
      partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, user: s.user })
    }
  )
)
