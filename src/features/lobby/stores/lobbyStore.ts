import { create } from 'zustand'

import type { LobbyData } from '@features/lobby/types/lobby'

interface LobbyStore {
  lobby: LobbyData | null
  setLobby: (lobby: LobbyData) => void
  clearLobby: () => void
  /** Changes one player's ready flag in the current lobby, if they're in it. */
  setPlayerReady: (playerId: string, isReady: boolean) => void
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
  setPlayerReady: (playerId, isReady) =>
    set(({ lobby }) => ({
      lobby: lobby && {
        ...lobby,
        players: lobby.players.map((player) =>
          player.id === playerId ? { ...player, isReady } : player,
        ),
      },
    })),
  joiningCode: null,
  setJoiningCode: (joiningCode) => set({ joiningCode }),
}))
