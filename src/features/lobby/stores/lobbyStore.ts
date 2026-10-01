import { create } from 'zustand'

import type { LobbyData } from '@features/lobby/types/lobby'

interface LobbyStore {
  lobby: LobbyData | null
  setLobby: (lobby: LobbyData) => void
  clearLobby: () => void
  /**
   * Code of the lobby a join request was last sent for, so the waiting room
   * can say "Joining" rather than "Loading" while it's in flight. Only
   * meaningful while that lobby is still loading.
   */
  joiningCode: string | null
  setJoiningCode: (code: string | null) => void
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  lobby: null,
  setLobby: (lobby) => set({ lobby }),
  clearLobby: () => set({ lobby: null }),
  joiningCode: null,
  setJoiningCode: (joiningCode) => set({ joiningCode }),
}))
