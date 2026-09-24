import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useEffect, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { LOBBY_ENDPOINTS } from '@features/lobby/api/lobbyApi'
import { useLobbyStore } from '@features/lobby/stores/lobbyStore'
import { mockLobby } from '@mocks/handlers'
import { server } from '@mocks/server'

import {
  INVALID_CODE_MESSAGE,
  LOAD_FAILED_MESSAGE,
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
})
