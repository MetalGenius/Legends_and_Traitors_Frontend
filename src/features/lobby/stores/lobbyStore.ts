import { create } from 'zustand'

import type { LobbyData } from '@features/lobby/types/lobby'

interface LobbyStore {
  lobby: LobbyData | null
  /**
   * Replaces the lobby outright - for entering one. To refresh the lobby
   * already on screen from a server answer, use `mergeLobby`.
   */
  setLobby: (lobby: LobbyData) => void
  clearLobby: () => void
  /** Changes one player's ready flag in the current lobby, if they're in it. */
  setPlayerReady: (playerId: string, isReady: boolean) => void
  /**
   * Marks "now". Take one just before sending a request that answers with
   * the lobby, and hand it to `mergeLobby` along with the answer.
   */
  checkpoint: () => number
  /**
   * Applies a lobby the server answered with, without undoing anything
   * newer. The answer shows the lobby as it was when the server replied, so
   * a ready flag `setPlayerReady` has changed after `since` (a live update,
   * or the player's own click) is newer than it, and is kept. Everything
   * else comes from the answer. Ignored unless it is the lobby already held.
   */
  mergeLobby: (answer: LobbyData, since: number) => void
  /**
   * Code of the lobby a join request was last sent for, so the waiting room
   * can say "Joining" rather than "Loading" while it's in flight. Only
   * meaningful while that lobby is still loading.
   */
  joiningCode: string | null
  setJoiningCode: (code: string | null) => void
}

export const useLobbyStore = create<LobbyStore>((set, get) => {
  // Bookkeeping for mergeLobby, kept out of the state as nothing renders
  // from it: `clock` ticks on every ready change, and `readyChanges` holds
  // each player's latest one with the tick it happened on.
  let clock = 0
  const readyChanges = new Map<string, { isReady: boolean; at: number }>()

  return {
    lobby: null,
    setLobby: (lobby) => {
      readyChanges.clear()
      set({ lobby })
    },
    clearLobby: () => {
      readyChanges.clear()
      set({ lobby: null })
    },
    setPlayerReady: (playerId, isReady) => {
      const { lobby } = get()
      if (!lobby) return
      clock += 1
      // Remembered even for a player not listed yet: the answer that
      // introduces them may be older than this.
      readyChanges.set(playerId, { isReady, at: clock })
      set({
        lobby: {
          ...lobby,
          players: lobby.players.map((player) =>
            player.id === playerId ? { ...player, isReady } : player,
          ),
        },
      })
    },
    checkpoint: () => clock,
    mergeLobby: (answer, since) => {
      if (get().lobby?.lobbyCode !== answer.lobbyCode) return
      set({
        lobby: {
          ...answer,
          players: answer.players.map((player) => {
            const change = readyChanges.get(player.id)
            return change && change.at > since ? { ...player, isReady: change.isReady } : player
          }),
        },
      })
    },
    joiningCode: null,
    setJoiningCode: (joiningCode) => set({ joiningCode }),
  }
})
