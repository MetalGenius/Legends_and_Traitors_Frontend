import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { LOBBY_ENDPOINTS } from '@features/lobby/api/lobbyApi'
import { useLobbyStore } from '@features/lobby/stores/lobbyStore'
import { mockGuestSession, mockHost, mockHostSession, mockLobby } from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'

import { READY_FAILED_MESSAGE, useReadyToggle } from './useReadyToggle'

/** The host's ready flag as the lobby page currently shows it. */
function hostIsReady() {
  return useLobbyStore.getState().lobby?.players.find((p) => p.id === mockHost.id)?.isReady
}

/**
 * Holds the ready request open until `respond` is called, so a test can look
 * at the UI state while it's in flight. Counts the requests it receives.
 */
function holdReadyRequest() {
  let arrive!: () => void
  const arrived = new Promise<void>((resolve) => {
    arrive = resolve
  })
  let release!: (response: Response) => void
  const held = {
    count: 0,
    /** Answers the request - once it has actually reached the server. */
    async respond(response: Response) {
      await arrived
      release(response)
    },
  }
  server.use(
    http.patch(LOBBY_ENDPOINTS.ready(':code'), () => {
      held.count += 1
      return new Promise<Response>((resolve) => {
        release = resolve
        arrive()
      })
    }),
  )
  return held
}

beforeEach(() => {
  // The host, looking at their own lobby, not ready yet.
  const { token, account } = mockHostSession
  useSessionStore.getState().setSession(token, account)
  useLobbyStore.getState().setLobby(structuredClone(mockLobby))
})

describe('useReadyToggle', () => {
  it('flips the flag instantly, before the server answers', async () => {
    const held = holdReadyRequest()
    const { result } = renderHook(() => useReadyToggle(mockLobby.lobbyCode))

    let toggling!: Promise<void>
    act(() => {
      toggling = result.current.toggleReady()
    })

    expect(hostIsReady()).toBe(true)
    expect(result.current.isSaving).toBe(true)

    await act(async () => {
      await held.respond(HttpResponse.json({ status: 'SUCCESS', data: mockLobby }))
      await toggling
    })
    expect(result.current.isSaving).toBe(false)
  })

  it('keeps the new state once the server accepts it', async () => {
    const { result } = renderHook(() => useReadyToggle(mockLobby.lobbyCode))

    await act(async () => {
      await result.current.toggleReady()
    })

    expect(hostIsReady()).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('toggles back off on a second press', async () => {
    const { result } = renderHook(() => useReadyToggle(mockLobby.lobbyCode))

    await act(async () => {
      await result.current.toggleReady()
    })
    await act(async () => {
      await result.current.toggleReady()
    })

    expect(hostIsReady()).toBe(false)
  })

  describe('when the server refuses', () => {
    it("flips back and shows the server's message", async () => {
      server.use(
        http.patch(LOBBY_ENDPOINTS.ready(':code'), () =>
          HttpResponse.json({ message: 'The game is starting' }, { status: 409 }),
        ),
      )
      const { result } = renderHook(() => useReadyToggle(mockLobby.lobbyCode))

      await act(async () => {
        await result.current.toggleReady()
      })

      expect(hostIsReady()).toBe(false)
      expect(result.current.error).toBe('The game is starting')
      expect(result.current.isSaving).toBe(false)
    })

    it('flips back with our own message when the request never gets through', async () => {
      server.use(http.patch(LOBBY_ENDPOINTS.ready(':code'), () => HttpResponse.error()))
      const { result } = renderHook(() => useReadyToggle(mockLobby.lobbyCode))

      await act(async () => {
        await result.current.toggleReady()
      })

      expect(hostIsReady()).toBe(false)
      expect(result.current.error).toBe(READY_FAILED_MESSAGE)
    })

    it('clears the error on the next attempt', async () => {
      server.use(
        http.patch(LOBBY_ENDPOINTS.ready(':code'), () => HttpResponse.error(), { once: true }),
      )
      const { result } = renderHook(() => useReadyToggle(mockLobby.lobbyCode))

      await act(async () => {
        await result.current.toggleReady()
      })
      expect(result.current.error).not.toBeNull()

      await act(async () => {
        await result.current.toggleReady()
      })
      expect(result.current.error).toBeNull()
      expect(hostIsReady()).toBe(true)
    })
  })

  it('sends only one request when pressed again while saving', async () => {
    const held = holdReadyRequest()
    const { result } = renderHook(() => useReadyToggle(mockLobby.lobbyCode))

    let first!: Promise<void>
    act(() => {
      first = result.current.toggleReady()
      void result.current.toggleReady()
    })
    // Let the (single) request reach the handler.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(held.count).toBe(1)
    expect(hostIsReady()).toBe(true)

    await act(async () => {
      await held.respond(HttpResponse.json({ status: 'SUCCESS', data: mockLobby }))
      await first
    })
  })

  it("does nothing for someone who isn't a player in the lobby", async () => {
    const { token, account } = mockGuestSession
    useSessionStore.getState().setSession(token, account)
    const held = holdReadyRequest()
    const { result } = renderHook(() => useReadyToggle(mockLobby.lobbyCode))

    await act(async () => {
      await result.current.toggleReady()
    })

    expect(held.count).toBe(0)
    expect(useLobbyStore.getState().lobby).toEqual(mockLobby)
  })

  it("leaves another lobby alone if the user left before the server answered", async () => {
    const held = holdReadyRequest()
    const { result } = renderHook(() => useReadyToggle(mockLobby.lobbyCode))
    const otherLobby = { ...mockLobby, lobbyCode: 'QQ11QQ' }

    let toggling!: Promise<void>
    act(() => {
      toggling = result.current.toggleReady()
    })
    // They move on to a different lobby while the request is out...
    act(() => {
      useLobbyStore.getState().setLobby(otherLobby)
    })
    // ...and then it fails: nothing to revert in the lobby they're now in.
    await act(async () => {
      await held.respond(HttpResponse.error())
      await toggling
    })

    expect(useLobbyStore.getState().lobby).toEqual(otherLobby)
  })
})
