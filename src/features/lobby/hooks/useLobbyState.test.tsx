import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { StrictMode, useEffect, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { LOBBY_ENDPOINTS } from '@features/lobby/api/lobbyApi'
import { useLobbyStore } from '@features/lobby/stores/lobbyStore'
import { usePlayerStore } from '@features/lobby/stores/playerStore'
import {
  mockFullLobby,
  mockGuest,
  mockGuestSession,
  mockHost,
  mockHostSession,
  mockJoinedLobby,
  mockLobby,
} from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore, type SessionAccount } from '@shared/lib/session'

import {
  GAME_STARTED_MESSAGE,
  INVALID_CODE_MESSAGE,
  JOIN_FAILED_MESSAGE,
  LOAD_FAILED_MESSAGE,
  LOBBY_FULL_MESSAGE,
  useLobbyState,
} from './useLobbyState'

/** Exposes where the hook navigated to, and the error it carried. */
let lastLocation: { pathname: string; lobbyError: string | null } = {
  pathname: '',
  lobbyError: null,
}

function LocationProbe() {
  const location = useLocation()
  const state = location.state as { lobbyError?: string } | null

  // In an effect, not during render - recording it is a side effect.
  useEffect(() => {
    lastLocation = {
      pathname: location.pathname,
      lobbyError: state?.lobbyError ?? null,
    }
  }, [location.pathname, state?.lobbyError])

  return null
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/lobby/AB12CD']}>
      <LocationProbe />
      <Routes>
        <Route path="/lobby/:code" element={children} />
        <Route path="/" element={null} />
      </Routes>
    </MemoryRouter>
  )
}

/** Records which lobby requests went out, still answered by the defaults. */
function recordRequests() {
  const sent: string[] = []
  server.events.on('request:start', ({ request }) => {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/api/lobby')) sent.push(`${request.method} ${pathname}`)
  })
  return sent
}

function signIn(session: { token: string; account: SessionAccount }) {
  useSessionStore.getState().setSession(session.token, session.account)
}

/**
 * Waits for the hook's request to finish. Every test must: an unfinished
 * request for the same code would be reused by the next test's enterLobby().
 */
async function settle(result: { current: { isLoading: boolean } }) {
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false)
  })
}

/** Renders the hook for `code` and waits for it to settle either way. */
async function renderSettled(code = 'AB12CD') {
  const hook = renderHook(() => useLobbyState(code), { wrapper })
  await settle(hook.result)
  return hook
}

beforeEach(() => {
  useLobbyStore.getState().clearLobby()
  useLobbyStore.getState().setJoiningCode(null)
  usePlayerStore.getState().clearPlayer()
  lastLocation = { pathname: '', lobbyError: null }
  server.events.removeAllListeners()
})

describe('useLobbyState', () => {
  it('starts out loading', async () => {
    const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

    expect(result.current.isLoading).toBe(true)
    await settle(result)
  })

  describe('first visit, with no account yet (invite link or typed code)', () => {
    it('joins straight away, without loading the lobby first', async () => {
      const sent = recordRequests()

      await renderSettled()

      expect(sent).toEqual(['POST /api/lobby/AB12CD/join'])
    })

    it('says "joining" while the join is in flight', async () => {
      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      expect(result.current.isJoining).toBe(true)
      await settle(result)
      expect(result.current.isJoining).toBe(false)
    })

    it('puts the joined lobby in the store and stays put', async () => {
      await renderSettled()

      expect(useLobbyStore.getState().lobby).toEqual(mockJoinedLobby)
      expect(lastLocation.pathname).toBe('/lobby/AB12CD')
    })

    it('keeps the guest account the join created', async () => {
      await renderSettled()

      expect(useSessionStore.getState().token).toBe(mockGuestSession.token)
      expect(useSessionStore.getState().account).toEqual(mockGuestSession.account)
    })

    it("stores our player's username as the player display name", async () => {
      await renderSettled()

      expect(usePlayerStore.getState().displayName).toBe(mockGuest.displayName)
    })

    it('joins only once under StrictMode', async () => {
      const sent = recordRequests()
      const strictWrapper = ({ children }: { children: ReactNode }) => (
        <StrictMode>{wrapper({ children })}</StrictMode>
      )

      const { result } = renderHook(() => useLobbyState('AB12CD'), {
        wrapper: strictWrapper,
      })
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(sent).toEqual(['POST /api/lobby/AB12CD/join'])
    })
  })

  describe('already a player (host after creating, refresh, back button)', () => {
    beforeEach(() => {
      signIn(mockHostSession)
    })

    it('only loads the lobby - no second join', async () => {
      const sent = recordRequests()

      await renderSettled()

      expect(sent).toEqual(['GET /api/lobby/AB12CD'])
      expect(useLobbyStore.getState().lobby).toEqual(mockLobby)
    })

    it('says "loading", not "joining"', async () => {
      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isJoining).toBe(false)
      await settle(result)
    })

    it("stores our player's username as the player display name", async () => {
      await renderSettled()

      expect(usePlayerStore.getState().displayName).toBe(mockHost.displayName)
    })
  })

  describe('signed in, but not a player in this lobby yet', () => {
    beforeEach(() => {
      signIn(mockGuestSession)
    })

    it('loads the lobby, sees we are not in it, then joins', async () => {
      const sent = recordRequests()

      await renderSettled()

      expect(sent).toEqual(['GET /api/lobby/AB12CD', 'POST /api/lobby/AB12CD/join'])
      expect(useLobbyStore.getState().lobby).toEqual(mockJoinedLobby)
    })

    it('keeps the existing session rather than replacing it', async () => {
      await renderSettled()

      expect(useSessionStore.getState().token).toBe(mockGuestSession.token)
    })
  })

  describe('when getting in fails', () => {
    describe("shows the server's own message", () => {
      it.each([
        ['an unknown or expired code', 'ZZ99ZZ', 'Lobby not found'],
        ['a full lobby', mockFullLobby.lobbyCode, 'Lobby is full'],
      ])('for %s', async (_, code, message) => {
        await renderSettled(code)

        expect(lastLocation.pathname).toBe('/')
        expect(lastLocation.lobbyError).toBe(message)
      })

      it.each([400, 403, 500])('for any join error status, e.g. %i', async (status) => {
        server.use(
          http.post(LOBBY_ENDPOINTS.join(':code'), () =>
            HttpResponse.json({ message: `Server says ${status}` }, { status }),
          ),
        )

        await renderSettled()

        expect(lastLocation.pathname).toBe('/')
        expect(lastLocation.lobbyError).toBe(`Server says ${status}`)
      })

      it('when loading the lobby fails too', async () => {
        signIn(mockGuestSession)
        server.use(
          http.get(LOBBY_ENDPOINTS.detail(':code'), () =>
            HttpResponse.json({ message: 'Lobby service is down' }, { status: 503 }),
          ),
        )

        await renderSettled()

        expect(lastLocation.lobbyError).toBe('Lobby service is down')
      })
    })

    describe('falls back to our own explanation when the response has no message', () => {
      /** An error page from a proxy, say - nothing the user should see. */
      function htmlError(status: number) {
        return () =>
          new HttpResponse('<html>Error</html>', {
            status,
            headers: { 'Content-Type': 'text/html' },
          })
      }

      it.each([
        [404, INVALID_CODE_MESSAGE],
        [409, LOBBY_FULL_MESSAGE],
        [400, GAME_STARTED_MESSAGE],
        [502, JOIN_FAILED_MESSAGE],
      ])('for a %i from the join', async (status, message) => {
        server.use(http.post(LOBBY_ENDPOINTS.join(':code'), htmlError(status)))

        await renderSettled()

        expect(lastLocation.lobbyError).toBe(message)
      })

      it('for a bare error from loading the lobby', async () => {
        signIn(mockGuestSession)
        server.use(http.get(LOBBY_ENDPOINTS.detail(':code'), htmlError(502)))

        await renderSettled()

        expect(lastLocation.lobbyError).toBe(LOAD_FAILED_MESSAGE)
      })

      it('for a message that is empty', async () => {
        server.use(
          http.post(LOBBY_ENDPOINTS.join(':code'), () =>
            HttpResponse.json({ message: '' }, { status: 404 }),
          ),
        )

        await renderSettled()

        expect(lastLocation.lobbyError).toBe(INVALID_CODE_MESSAGE)
      })
    })

    it('redirects Home with the join message on a network failure while joining', async () => {
      server.use(http.post(LOBBY_ENDPOINTS.join(':code'), () => HttpResponse.error()))

      await renderSettled()

      expect(lastLocation.lobbyError).toBe(JOIN_FAILED_MESSAGE)
    })

    it('redirects Home with the load message on a network failure while loading', async () => {
      signIn(mockGuestSession)
      server.use(http.get(LOBBY_ENDPOINTS.detail(':code'), () => HttpResponse.error()))

      await renderSettled()

      expect(lastLocation.lobbyError).toBe(LOAD_FAILED_MESSAGE)
    })

    it('drops any lobby and player name already in the stores', async () => {
      useLobbyStore.getState().setLobby(mockLobby)
      usePlayerStore.getState().setDisplayName('From another lobby')

      await renderSettled('ZZ99ZZ')

      expect(useLobbyStore.getState().lobby).toBeNull()
      expect(usePlayerStore.getState().displayName).toBeNull()
    })

    it('creates no guest session when the join is refused', async () => {
      await renderSettled(mockFullLobby.lobbyCode)

      expect(useSessionStore.getState().token).toBeNull()
    })
  })

  describe('with no code in the URL at all', () => {
    it('redirects Home without waiting on a request', async () => {
      const { result } = renderHook(() => useLobbyState(undefined), { wrapper })

      await waitFor(() => {
        expect(lastLocation.pathname).toBe('/')
      })
      expect(lastLocation.lobbyError).toBe(INVALID_CODE_MESSAGE)
      expect(result.current.isLoading).toBe(false)
    })
  })
})
