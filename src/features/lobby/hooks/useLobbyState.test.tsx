import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useEffect, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { joinLobby, LOBBY_ENDPOINTS } from '@features/lobby/api/lobbyApi'
import { useLobbyStore } from '@features/lobby/stores/lobbyStore'
import { usePlayerStore } from '@features/lobby/stores/playerStore'
import { mockFullLobby, mockGuest, mockJoinedLobby, mockLobby } from '@mocks/handlers'
import { server } from '@mocks/server'

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

beforeEach(() => {
  useLobbyStore.getState().clearLobby()
  useLobbyStore.getState().clearPendingJoin()
  usePlayerStore.getState().clearPlayer()
  lastLocation = { pathname: '', lobbyError: null }
})

describe('useLobbyState', () => {
  it('starts out loading', () => {
    const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

    expect(result.current.isLoading).toBe(true)
  })

  describe('when the lobby loads', () => {
    it('puts it in the store and clears loading', async () => {
      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(useLobbyStore.getState().lobby).toEqual(mockLobby)
    })

    it('stays put instead of redirecting', async () => {
      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(lastLocation.pathname).toBe('/lobby/AB12CD')
    })
  })

  describe('when the lobby is missing (404)', () => {
    it('redirects Home explaining the code is invalid', async () => {
      renderHook(() => useLobbyState('ZZ99ZZ'), { wrapper })

      await waitFor(() => {
        expect(lastLocation.pathname).toBe('/')
      })
      expect(lastLocation.lobbyError).toBe(INVALID_CODE_MESSAGE)
    })

    it('clears loading rather than leaving the screen stuck', async () => {
      const { result } = renderHook(() => useLobbyState('ZZ99ZZ'), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('drops any lobby already in the store', async () => {
      useLobbyStore.getState().setLobby(mockLobby)

      renderHook(() => useLobbyState('ZZ99ZZ'), { wrapper })

      await waitFor(() => {
        expect(useLobbyStore.getState().lobby).toBeNull()
      })
    })
  })

  describe('when the request fails for another reason', () => {
    it('redirects Home with a generic message on a network failure', async () => {
      server.use(http.get(LOBBY_ENDPOINTS.detail(':code'), () => HttpResponse.error()))

      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      await waitFor(() => {
        expect(lastLocation.pathname).toBe('/')
      })
      // Not the "invalid code" wording - the code may well be fine.
      expect(lastLocation.lobbyError).toBe(LOAD_FAILED_MESSAGE)
      expect(result.current.isLoading).toBe(false)
    })

    it('redirects Home with a generic message on a 500', async () => {
      server.use(
        http.get(LOBBY_ENDPOINTS.detail(':code'), () =>
          HttpResponse.json({ message: 'Boom' }, { status: 500 }),
        ),
      )

      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      await waitFor(() => {
        expect(lastLocation.pathname).toBe('/')
      })
      expect(lastLocation.lobbyError).toBe(LOAD_FAILED_MESSAGE)
      expect(result.current.isLoading).toBe(false)
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

  describe('when the user just asked to join from Home', () => {
    /** What useJoinLobby leaves behind before navigating here. */
    function startJoin(code = 'AB12CD') {
      const request = joinLobby(code)
      request.catch(() => {})
      useLobbyStore.getState().setPendingJoin({ code, request })
    }

    it('waits on the join instead of fetching, then stores the joined lobby', async () => {
      let fetched = false
      server.use(
        http.get(LOBBY_ENDPOINTS.detail(':code'), () => {
          fetched = true
          return HttpResponse.json({ status: 'SUCCESS', data: mockLobby })
        }),
      )
      startJoin()

      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      expect(result.current.isJoining).toBe(true)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.isJoining).toBe(false)
      expect(useLobbyStore.getState().lobby).toEqual(mockJoinedLobby)
      expect(lastLocation.pathname).toBe('/lobby/AB12CD')
      expect(fetched).toBe(false)
    })

    it("stores our player's username as the player display name", async () => {
      startJoin()

      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      // The mock join lists us under the account's display name.
      expect(usePlayerStore.getState().displayName).toBe(mockGuest.displayName)
    })

    it("leaves the player display name alone if we aren't in the joined lobby", async () => {
      // A server answering with a lobby that somehow doesn't include us.
      useLobbyStore.getState().setPendingJoin({
        code: 'AB12CD',
        request: Promise.resolve({ status: 'SUCCESS', data: mockLobby }),
      })

      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(usePlayerStore.getState().displayName).toBeNull()
    })

    it('spends the pending join once it settles', async () => {
      startJoin()

      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(useLobbyStore.getState().pendingJoin).toBeNull()
    })

    it('ignores a pending join for a different code and fetches instead', async () => {
      startJoin('QQ11QQ')

      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      expect(result.current.isJoining).toBe(false)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(useLobbyStore.getState().lobby).toEqual(mockLobby)
      // Only a join sets who we are in the lobby.
      expect(usePlayerStore.getState().displayName).toBeNull()
    })

    it('clears the player display name when a join fails', async () => {
      usePlayerStore.getState().setDisplayName('From another lobby')
      startJoin('ZZ99ZZ')

      renderHook(() => useLobbyState('ZZ99ZZ'), { wrapper })

      await waitFor(() => {
        expect(lastLocation.pathname).toBe('/')
      })
      expect(usePlayerStore.getState().displayName).toBeNull()
    })

    it.each([
      [404, INVALID_CODE_MESSAGE],
      [409, LOBBY_FULL_MESSAGE],
      [400, GAME_STARTED_MESSAGE],
      [500, JOIN_FAILED_MESSAGE],
    ])('redirects Home with the right message on a %i', async (status, message) => {
      server.use(
        http.post(LOBBY_ENDPOINTS.join(':code'), () =>
          HttpResponse.json({ message: 'Nope' }, { status }),
        ),
      )
      startJoin()

      const { result } = renderHook(() => useLobbyState('AB12CD'), { wrapper })

      await waitFor(() => {
        expect(lastLocation.pathname).toBe('/')
      })
      expect(lastLocation.lobbyError).toBe(message)
      expect(result.current.isLoading).toBe(false)
      expect(useLobbyStore.getState().lobby).toBeNull()
    })

    it('redirects Home explaining the lobby is full when every seat is taken', async () => {
      const code = mockFullLobby.lobbyCode
      startJoin(code)

      renderHook(() => useLobbyState(code), { wrapper })

      await waitFor(() => {
        expect(lastLocation.pathname).toBe('/')
      })
      expect(lastLocation.lobbyError).toBe(LOBBY_FULL_MESSAGE)
    })

    it('redirects Home with the join message on a network failure', async () => {
      server.use(http.post(LOBBY_ENDPOINTS.join(':code'), () => HttpResponse.error()))
      startJoin()

      renderHook(() => useLobbyState('AB12CD'), { wrapper })

      await waitFor(() => {
        expect(lastLocation.pathname).toBe('/')
      })
      expect(lastLocation.lobbyError).toBe(JOIN_FAILED_MESSAGE)
    })
  })
})
