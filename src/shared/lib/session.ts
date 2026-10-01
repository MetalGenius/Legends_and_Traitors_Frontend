import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Who the app is acting as - a signed-in user or a server-issued guest.
 * Shared rather than owned by `auth`: auth writes it, and every feature that
 * talks to the API reads the token from it.
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

// A session being created right now (e.g. the guest request on first load).
// Requests wait on it so an early click doesn't go out without a token.
let pendingSession: Promise<unknown> | null = null

export function trackPendingSession(request: Promise<unknown>) {
  pendingSession = request
  request
    .finally(() => {
      if (pendingSession === request) pendingSession = null
    })
    .catch(() => {})
}

/** Bearer header for the current session, once any pending one has settled. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (pendingSession) await pendingSession.catch(() => {})
  const { token } = useSessionStore.getState()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
