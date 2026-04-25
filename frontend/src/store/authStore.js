import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Custom cookie storage
const cookieStorage = {
  getItem: (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },
  setItem: (name, value) => {
    document.cookie = `${name}=${value}; path=/; max-age=604800; SameSite=Lax`;
  },
  removeItem: (name) => {
    document.cookie = `${name}=; path=/; max-age=-1`;
  }
};

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
      name: 'pharmacy-auth-data',
      storage: cookieStorage,
      partialize: (s) => ({ user: s.user }) // Only persist user info in cookies, tokens are handled by HttpOnly
    }
  )
)
