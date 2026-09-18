import { beforeEach, describe, expect, it } from 'vitest'

import type { LobbyData } from '@features/lobby/types/lobby'

import { useLobbyStore } from './lobbyStore'

const lobby: LobbyData = {
  lobbyCode: 'AB12CD',
  lobbyUrl: 'https://app.com/lobby/AB12CD',
  hostId: 'host-1',
  maxPlayers: 8,
  players: [{ id: 'host-1', name: 'HostName', isHost: true, isReady: false }],
}

// Module-level singleton shared across tests - reset it each time.
beforeEach(() => {
  useLobbyStore.getState().clearLobby()
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
    useLobbyStore.getState().setLobby({ ...lobby, lobbyCode: 'ZZ99ZZ', maxPlayers: 4 })

    expect(useLobbyStore.getState().lobby?.lobbyCode).toBe('ZZ99ZZ')
    expect(useLobbyStore.getState().lobby?.maxPlayers).toBe(4)
  })

  it('clears the lobby back to null', () => {
    useLobbyStore.getState().setLobby(lobby)
    useLobbyStore.getState().clearLobby()

    expect(useLobbyStore.getState().lobby).toBeNull()
  })
})
