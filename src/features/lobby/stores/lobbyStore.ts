import { create } from 'zustand'

import type { LobbyData, LobbyResponse } from '@features/lobby/types/lobby'

export interface PendingJoin {
  code: string
  request: Promise<LobbyResponse>
}

interface LobbyStore {
  lobby: LobbyData | null
  setLobby: (lobby: LobbyData) => void
  clearLobby: () => void
  /**
   * Join request started from Home, handed to the lobby page so it can wait
   * on it instead of fetching. Holding the promise (not just the code) means
   * a re-run effect - e.g. under StrictMode - awaits the same request rather
   * than joining twice. In-memory only, so a refresh falls back to a GET.
   */
  pendingJoin: PendingJoin | null
  setPendingJoin: (pendingJoin: PendingJoin) => void
  clearPendingJoin: () => void
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  lobby: null,
  setLobby: (lobby) => set({ lobby }),
  clearLobby: () => set({ lobby: null }),
  pendingJoin: null,
  setPendingJoin: (pendingJoin) => set({ pendingJoin }),
  clearPendingJoin: () => set({ pendingJoin: null }),
}))
