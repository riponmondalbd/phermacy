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
      logout: () => {
        set({ token: null, refreshToken: null, user: null });
        // Clear HttpOnly cookies via backend or just let them expire
        document.cookie = 'token=; path=/; max-age=-1';
        document.cookie = 'refreshToken=; path=/; max-age=-1';
      },
      updateUser: (user) => set({ user: { ...get().user, ...user } }),

      isAdmin: () => get().user?.role === 'ADMIN',
      isManager: () => ['ADMIN', 'MANAGER'].includes(get().user?.role),
      isSalesman: () => get().user?.role === 'SALESMAN',
      canEdit: (page) => {
        const role = get().user?.role;
        if (['ADMIN', 'MANAGER'].includes(role)) return true;
        if (role === 'SALESMAN') {
          return ['pos', 'cash', 'returns'].includes(page);
        }
        return false;
      }
    }),
    {
      name: 'pharmacy-auth-user',
      partialize: (s) => ({ user: s.user }) // Only persist user info in localStorage, tokens are in secure cookies
    }
  )
)
