import { beforeEach, describe, expect, it } from 'vitest'

import type { LobbyData } from '@features/lobby/types/lobby'

import { useLobbyStore } from './lobbyStore'

const lobby: LobbyData = {
  lobbyCode: 'AB12CD',
  hostId: 'host-1',
  players: [{ id: 'host-1', username: 'HostName', isHost: true, isReady: false }],
}

// Module-level singleton shared across tests - reset it each time.
beforeEach(() => {
  useLobbyStore.getState().clearLobby()
  useLobbyStore.getState().setJoiningCode(null)
})

describe('lobbyStore', () => {
  it('starts with no lobby', () => {
    expect(useLobbyStore.getState().lobby).toBeNull()
  })

  it('stores the lobby passed to setLobby', () => {
    useLobbyStore.getState().setLobby(lobby)

    expect(useLobbyStore.getState().lobby).toEqual(lobby)
  })

  it('replaces an existing lobby rather than merging into it', () => {
    useLobbyStore.getState().setLobby(lobby)
    useLobbyStore.getState().setLobby({ ...lobby, lobbyCode: 'ZZ99ZZ', hostId: 'host-2' })

    expect(useLobbyStore.getState().lobby?.lobbyCode).toBe('ZZ99ZZ')
    expect(useLobbyStore.getState().lobby?.hostId).toBe('host-2')
  })

  it('clears the lobby back to null', () => {
    useLobbyStore.getState().setLobby(lobby)
    useLobbyStore.getState().clearLobby()

    expect(useLobbyStore.getState().lobby).toBeNull()
  })

  it('starts with no join in flight', () => {
    expect(useLobbyStore.getState().joiningCode).toBeNull()
  })

  it('records and clears the code being joined', () => {
    useLobbyStore.getState().setJoiningCode('AB12CD')
    expect(useLobbyStore.getState().joiningCode).toBe('AB12CD')

    useLobbyStore.getState().setJoiningCode(null)
    expect(useLobbyStore.getState().joiningCode).toBeNull()
  })

  describe('setPlayerReady', () => {
    const twoPlayers: LobbyData = {
      ...lobby,
      players: [
        ...lobby.players,
        { id: 'p2', username: 'Guinevere', isHost: false, isReady: false },
      ],
    }

    it("changes only that player's ready flag", () => {
      useLobbyStore.getState().setLobby(twoPlayers)

      useLobbyStore.getState().setPlayerReady('p2', true)

      const players = useLobbyStore.getState().lobby?.players
      expect(players?.find((p) => p.id === 'p2')?.isReady).toBe(true)
      expect(players?.find((p) => p.id === 'host-1')?.isReady).toBe(false)
    })

    it('does nothing without a lobby', () => {
      useLobbyStore.getState().setPlayerReady('p2', true)

      expect(useLobbyStore.getState().lobby).toBeNull()
    })
  })
})
