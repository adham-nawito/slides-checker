import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
}

/**
 * Custom storage adapter that transparently migrates the old AuthContext
 * localStorage format ({ token, role, username }) to the Zustand persist
 * format ({ state: { user: {...} }, version: 0 }).
 *
 * This means existing logged-in sessions survive the upgrade without
 * requiring users to sign in again.
 */
const migratingStorage = {
  getItem: (name: string): string | null => {
    const raw = localStorage.getItem(name)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      // Old AuthContext format: top-level { token, role, username }
      if (parsed.token && parsed.role && parsed.username && !parsed.state) {
        return JSON.stringify({ state: { user: parsed }, version: 0 })
      }
      return raw
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string) => localStorage.setItem(name, value),
  removeItem: (name: string) => localStorage.removeItem(name),
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'pptx-auth',
      storage: createJSONStorage(() => migratingStorage),
    },
  ),
)

/**
 * Read auth state outside of React — safe to call in router beforeLoad,
 * axios interceptors, or anywhere that can't use hooks.
 */
export function getStoredUser(): AuthUser | null {
  return useAuthStore.getState().user
}
