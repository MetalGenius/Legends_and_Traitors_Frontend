import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LOBBY_ENDPOINTS, setReadyState } from '@features/lobby/api/lobbyApi'
import { useLobbyStore } from '@features/lobby/stores/lobbyStore'
import {
  broadcastToRoom,
  dropSocketClients,
  joinedRooms,
  mockHost,
  mockHostSession,
  mockLobby,
} from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'
import { socketBaseUrl, subscribe } from '@shared/lib/socket'

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

/** mockLobby as the server would answer with it, with these ready flags instead. */
function lobbyWith(flags: Record<string, boolean>) {
  return {
    ...mockLobby,
    players: mockLobby.players.map((p) => (p.id in flags ? { ...p, isReady: flags[p.id] } : p)),
  }
}

/**
 * Holds every lobby fetch open. Each one that arrives adds a function to the
 * returned list, in order; call it with a lobby to answer that fetch.
 */
function holdLobbyFetches() {
  const answers: ((lobby: object) => void)[] = []
  server.use(
    http.get(
      LOBBY_ENDPOINTS.detail(':code'),
      () =>
        new Promise<Response>((resolve) => {
          answers.push((lobby) => resolve(HttpResponse.json({ status: 'SUCCESS', data: lobby })))
        }),
    ),
  )
  return answers
}

/**
 * Drops the connection, then waits (through the 1s backoff) until the hook
 * is back in its room and has asked for the lobby again - `fetches` in all.
 */
async function reconnect(answers: unknown[], fetches: number) {
  dropSocketClients()
  await waitFor(() => {
    expect(joinedRooms()).toEqual([])
  })
  await waitFor(
    () => {
      expect(joinedRooms()).toEqual([lobbyRoom(code)])
      expect(answers).toHaveLength(fetches)
    },
    { timeout: 3_000 },
  )
}

beforeEach(() => {
  const { token, account } = mockHostSession
  useSessionStore.getState().setSession(token, account)
  useLobbyStore.getState().setLobby(structuredClone(mockLobby))
})

// The event exactly as docs/websocket-protocol.md has it, read off the wire
// rather than through the app's own socket code.
describe('player_ready_changed on the wire', () => {
  it('is broadcast to the lobby room, in the documented format, when a player readies up', async () => {
    const frames: unknown[] = []
    const wire = new WebSocket(socketBaseUrl())
    wire.addEventListener('message', (event) => frames.push(JSON.parse(String(event.data))))
    await new Promise((resolve) => wire.addEventListener('open', resolve))
    wire.send(JSON.stringify({ event: 'join_room', room: 'lobby:AB12CD' }))
    await waitFor(() => {
      expect(joinedRooms()).toEqual(['lobby:AB12CD'])
    })

    // The host (signed in above) readies up over REST.
    await setReadyState('AB12CD', true)

    await waitFor(() => {
      expect(frames).toEqual([
        {
          event: 'player_ready_changed',
          room: 'lobby:AB12CD',
          data: { playerId: mockHost.id, isReady: true },
        },
      ])
    })
    wire.close()
  })
})

describe('useLobbySocket', () => {
  it("merges another player's ready change into the lobby", async () => {
    await renderSubscribed()

    announce({ playerId: guinevere.id, isReady: false })

    await waitFor(() => {
      expect(readyOf(guinevere.id)).toBe(false)
    })
  })

  it("changes only that player's flag", async () => {
    const before = structuredClone(useLobbyStore.getState().lobby!)
    await renderSubscribed()

    announce({ playerId: guinevere.id, isReady: false })

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
      announce({ playerId: lancelot.id, isReady: false })

      await waitFor(() => {
        expect(readyOf(lancelot.id)).toBe(false)
      })
      expect(readyOf(guinevere.id)).toBe(true)
    }

    it("another lobby's events on the same connection", async () => {
      // Something else on the shared socket is listening to a second lobby,
      // so the server sends this client that lobby's events too.
      const otherRoom = lobbyRoom('QQ11QQ')
      const heardInOtherLobby = vi.fn()
      subscribe(otherRoom, PLAYER_READY_CHANGED, heardInOtherLobby)
      await renderSubscribed()
      await waitFor(() => {
        expect(joinedRooms()).toContain(otherRoom)
      })

      broadcastToRoom(otherRoom, PLAYER_READY_CHANGED, { playerId: guinevere.id, isReady: false })

      // It arrived, and went to the other lobby's listener alone.
      await waitFor(() => {
        expect(heardInOtherLobby).toHaveBeenCalledTimes(1)
      })
      expect(readyOf(guinevere.id)).toBe(true)
    })

    it('events missing fields', async () => {
      await expectIgnored({ playerId: guinevere.id })
    })

    it('players not in the lobby', async () => {
      const before = structuredClone(useLobbyStore.getState().lobby!.players)
      await expectIgnored({ playerId: 'stranger', isReady: false })

      // Nobody was added for the stranger.
      expect(useLobbyStore.getState().lobby!.players.map((p) => p.id)).toEqual(
        before.map((p) => p.id),
      )
    })

    it('events for a lobby the user has since left', async () => {
      await renderSubscribed()
      const elsewhere = { ...mockLobby, lobbyCode: 'QQ11QQ' }
      useLobbyStore.getState().setLobby(elsewhere)

      announce({ playerId: guinevere.id, isReady: false })
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

  describe('after the connection drops', () => {
    it('catches up on what it missed', async () => {
      await renderSubscribed()
      // While offline, Guinevere un-readied - and nobody heard the broadcast.
      server.use(
        http.get(LOBBY_ENDPOINTS.detail(':code'), () =>
          HttpResponse.json({ status: 'SUCCESS', data: lobbyWith({ [guinevere.id]: false }) }),
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

    it('keeps a live update that lands before the catch-up answer does', async () => {
      await renderSubscribed()
      const answers = holdLobbyFetches()
      await reconnect(answers, 1)

      // Back online with the catch-up request still out, Guinevere un-readies
      // and the event reaches us first...
      announce({ playerId: guinevere.id, isReady: false })
      await waitFor(() => {
        expect(readyOf(guinevere.id)).toBe(false)
      })
      // ...then the answer, put together before she did: in it she is still
      // ready. It does know Lancelot un-readied while we were offline.
      answers[0](lobbyWith({ [lancelot.id]: false }))

      await waitFor(() => {
        expect(readyOf(lancelot.id)).toBe(false)
      })
      expect(readyOf(guinevere.id)).toBe(false)
    })

    it('uses only the latest answer when it has reconnected twice', async () => {
      await renderSubscribed()
      const answers = holdLobbyFetches()
      await reconnect(answers, 1)
      await reconnect(answers, 2)

      // The second request is answered first...
      answers[1](lobbyWith({ [guinevere.id]: false }))
      await waitFor(() => {
        expect(readyOf(guinevere.id)).toBe(false)
      })
      // ...and the first, older one straggles in after it.
      answers[0](lobbyWith({ [lancelot.id]: false }))
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(readyOf(guinevere.id)).toBe(false)
      expect(readyOf(lancelot.id)).toBe(true)
    })
  })
})
