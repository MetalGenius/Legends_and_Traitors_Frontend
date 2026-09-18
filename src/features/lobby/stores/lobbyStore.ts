import { create } from 'zustand'

import type { LobbyData } from '@features/lobby/types/lobby'

interface LobbyStore {
  lobby: LobbyData | null
  setLobby: (lobby: LobbyData) => void
  clearLobby: () => void
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  lobby: null,
  setLobby: (lobby) => set({ lobby }),
  clearLobby: () => set({ lobby: null }),
}))
