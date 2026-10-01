import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Who the app is acting as - a signed-in user, or the guest the server
 * created when they first joined a lobby without one. Shared rather than
 * owned by a feature: any feature that talks to the API reads the token here.
 */
export interface SessionAccount {
  id: string
  /** Unique handle - not for display. */
  username: string
  /** What other players see. */
  displayName: string
  isGuest: boolean
}

interface SessionState {
  token: string | null
  account: SessionAccount | null
  setSession: (token: string, account: SessionAccount) => void
  clearSession: () => void
}

/** Persisted so a refresh keeps the same guest instead of minting a new one. */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      account: null,
      setSession: (token, account) => set({ token, account }),
      clearSession: () => set({ token: null, account: null }),
    }),
    {
      name: 'lt-session',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ token, account }) => ({ token, account }),
    },
  ),
)

/** Bearer header for the current session, or nothing without one. */
export function authHeaders(): Record<string, string> {
  const { token } = useSessionStore.getState()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
