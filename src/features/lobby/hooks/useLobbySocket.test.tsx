import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { LOBBY_ENDPOINTS } from '@features/lobby/api/lobbyApi'
import { useLobbyStore } from '@features/lobby/stores/lobbyStore'
import {
  broadcastToRoom,
  dropSocketClients,
  joinedRooms,
  mockHostSession,
  mockLobby,
} from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'

import { lobbyRoom, PLAYER_READY_CHANGED, useLobbySocket } from './useLobbySocket'

const code = mockLobby.lobbyCode
// In the mock lobby and ready - the event below un-readies her.
const guinevere = mockLobby.players.find((p) => p.username === 'Guinevere')!
// Also ready - used as a marker that later events have been delivered.
const lancelot = mockLobby.players.find((p) => p.username === 'Lancelot')!

function readyOf(playerId: string) {
  return useLobbyStore.getState().lobby?.players.find((p) => p.id === playerId)?.isReady
}

/** Renders the hook for `lobbyCode` and waits until its room is joined. */
async function renderSubscribed(lobbyCode = code) {
  const hook = renderHook(({ c }) => useLobbySocket(c), {
    initialProps: { c: lobbyCode as string | null },
  })
  await waitFor(() => {
    expect(joinedRooms()).toContain(lobbyRoom(lobbyCode))
  })
  return hook
}

function announce(data: object) {
  broadcastToRoom(lobbyRoom(code), PLAYER_READY_CHANGED, data)
}

beforeEach(() => {
  const { token, account } = mockHostSession
  useSessionStore.getState().setSession(token, account)
  useLobbyStore.getState().setLobby(structuredClone(mockLobby))
})

describe('useLobbySocket', () => {
  it("merges another player's ready change into the lobby", async () => {
    await renderSubscribed()

    announce({ lobbyCode: code, playerId: guinevere.id, isReady: false })

    await waitFor(() => {
      expect(readyOf(guinevere.id)).toBe(false)
    })
  })

  it("changes only that player's flag", async () => {
    const before = structuredClone(useLobbyStore.getState().lobby!)
    await renderSubscribed()

    announce({ lobbyCode: code, playerId: guinevere.id, isReady: false })

    await waitFor(() => {
      expect(readyOf(guinevere.id)).toBe(false)
    })
    const others = (lobby: typeof before) => lobby.players.filter((p) => p.id !== guinevere.id)
    expect(others(useLobbyStore.getState().lobby!)).toEqual(others(before))
  })

  describe('ignores', () => {
    /**
     * Sends `data`, then a real change for Lancelot. Events arrive in order,
     * so once Lancelot's lands, `data` has been handled - and must have
     * changed nothing for Guinevere.
     */
    async function expectIgnored(data: object) {
      await renderSubscribed()

      announce(data)
      announce({ lobbyCode: code, playerId: lancelot.id, isReady: false })

      await waitFor(() => {
        expect(readyOf(lancelot.id)).toBe(false)
      })
      expect(readyOf(guinevere.id)).toBe(true)
    }

    it('events about another lobby', async () => {
      await expectIgnored({ lobbyCode: 'QQ11QQ', playerId: guinevere.id, isReady: false })
    })

    it('events missing fields', async () => {
      await expectIgnored({ lobbyCode: code, playerId: guinevere.id })
    })

    it('players not in the lobby', async () => {
      const before = structuredClone(useLobbyStore.getState().lobby!.players)
      await expectIgnored({ lobbyCode: code, playerId: 'stranger', isReady: false })

      // Nobody was added for the stranger.
      expect(useLobbyStore.getState().lobby!.players.map((p) => p.id)).toEqual(
        before.map((p) => p.id),
      )
    })

    it('events for a lobby the user has since left', async () => {
      await renderSubscribed()
      const elsewhere = { ...mockLobby, lobbyCode: 'QQ11QQ' }
      useLobbyStore.getState().setLobby(elsewhere)

      announce({ lobbyCode: code, playerId: guinevere.id, isReady: false })
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(useLobbyStore.getState().lobby).toEqual(elsewhere)
    })
  })

  it('does not subscribe while given no lobby', async () => {
    renderHook(() => useLobbySocket(null))
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(joinedRooms()).toEqual([])
  })

  it('leaves the room on unmount', async () => {
    const { unmount } = await renderSubscribed()

    unmount()

    await waitFor(() => {
      expect(joinedRooms()).toEqual([])
    })
  })

  it('moves rooms when the lobby changes', async () => {
    const { rerender } = await renderSubscribed()

    rerender({ c: 'QQ11QQ' })

    await waitFor(() => {
      expect(joinedRooms()).toEqual([lobbyRoom('QQ11QQ')])
    })
  })

  it('catches up on what it missed after the connection drops', async () => {
    await renderSubscribed()
    // While offline, Guinevere un-readied - and nobody heard the broadcast.
    const missed = {
      ...mockLobby,
      players: mockLobby.players.map((p) => (p.id === guinevere.id ? { ...p, isReady: false } : p)),
    }
    server.use(
      http.get(LOBBY_ENDPOINTS.detail(':code'), () =>
        HttpResponse.json({ status: 'SUCCESS', data: missed }),
      ),
    )

    dropSocketClients()

    // Reconnects after the 1s backoff, then refetches.
    await waitFor(
      () => {
        expect(readyOf(guinevere.id)).toBe(false)
      },
      { timeout: 3_000 },
    )
  })
})
