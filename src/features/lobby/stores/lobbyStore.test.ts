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

  // A server answer can be older than what's already on screen: these pin
  // down which of the two wins, flag by flag.
  describe('mergeLobby', () => {
    const guinevere = { id: 'p2', username: 'Guinevere', isHost: false, isReady: true }
    const lancelot = { id: 'p3', username: 'Lancelot', isHost: false, isReady: true }
    const percival = { id: 'p4', username: 'Percival', isHost: false, isReady: false }
    const held: LobbyData = { ...lobby, players: [...lobby.players, guinevere, lancelot] }

    const store = () => useLobbyStore.getState()
    const readyOf = (id: string) => store().lobby?.players.find((p) => p.id === id)?.isReady
    /** The server's answer: `held`, with these ready flags instead. */
    const answerWith = (flags: Record<string, boolean>): LobbyData => ({
      ...held,
      players: held.players.map((p) => (p.id in flags ? { ...p, isReady: flags[p.id] } : p)),
    })

    beforeEach(() => {
      store().setLobby(held)
    })

    it('takes the answer when nothing has changed since the request was sent', () => {
      const since = store().checkpoint()

      store().mergeLobby(answerWith({ p2: false }), since)

      expect(store().lobby).toEqual(answerWith({ p2: false }))
    })

    it('keeps a ready change made after the request was sent', () => {
      const since = store().checkpoint()
      // Guinevere un-readies while the request is out...
      store().setPlayerReady('p2', false)

      // ...and the answer predates that: in it, she is still ready.
      store().mergeLobby(answerWith({ p3: false }), since)

      expect(readyOf('p2')).toBe(false)
      // Everyone she isn't still comes from the answer.
      expect(readyOf('p3')).toBe(false)
    })

    it('lets the answer overrule a change made before the request was sent', () => {
      store().setPlayerReady('p2', false)
      const since = store().checkpoint()

      store().mergeLobby(answerWith({ p2: true }), since)

      expect(readyOf('p2')).toBe(true)
    })

    it('judges each request by when it was sent, not when it was answered', () => {
      const early = store().checkpoint()
      store().setPlayerReady('p2', false)
      const late = store().checkpoint()

      // Sent after her change, so it knows better than we do...
      store().mergeLobby(answerWith({ p2: true }), late)
      expect(readyOf('p2')).toBe(true)

      // ...while one sent before it does not, however late it is answered.
      store().setPlayerReady('p2', false)
      store().mergeLobby(answerWith({ p2: true }), early)
      expect(readyOf('p2')).toBe(false)
    })

    it('takes players who have come or gone from the answer', () => {
      const since = store().checkpoint()

      store().mergeLobby({ ...held, players: [held.players[0], lancelot, percival] }, since)

      expect(store().lobby?.players.map((p) => p.id)).toEqual(['host-1', 'p3', 'p4'])
    })

    it('applies a newer change to a player the answer is first to list', () => {
      const since = store().checkpoint()
      // Percival joined and readied up; we haven't been told he joined.
      store().setPlayerReady('p4', true)
      expect(store().lobby).toEqual(held)

      store().mergeLobby({ ...held, players: [...held.players, percival] }, since)

      expect(readyOf('p4')).toBe(true)
    })

    it('ignores an answer about a lobby other than the one held', () => {
      const since = store().checkpoint()

      store().mergeLobby({ ...answerWith({ p2: false }), lobbyCode: 'ZZ99ZZ' }, since)

      expect(store().lobby).toEqual(held)
    })

    it('does nothing without a lobby', () => {
      store().clearLobby()

      store().mergeLobby(held, store().checkpoint())

      expect(store().lobby).toBeNull()
    })
  })
})
