import { act, renderHook, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { useLobbyStore } from '@features/lobby/stores/lobbyStore'
import { LOBBY_ENDPOINTS } from '@features/lobby/api/lobbyApi'
import { mockGuestSession, mockJoinedLobby } from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'

import { useJoinLobby } from './useJoinLobby'

/** Renders whatever code the /lobby/:code route was navigated to with. */
function LobbyProbe() {
  const { code } = useParams<{ code?: string }>()
  return <div data-testid="lobby-probe">{code}</div>
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={children} />
        <Route path="/lobby/:code" element={<LobbyProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useLobbyStore.getState().clearPendingJoin()
})

describe('useJoinLobby', () => {
  // The waiting room shows the loading state; Home doesn't wait on the API.
  it('goes straight to the lobby for the given code', () => {
    const { result } = renderHook(() => useJoinLobby(), { wrapper })

    act(() => {
      result.current.joinLobby('AB12CD')
    })

    expect(screen.getByTestId('lobby-probe').textContent).toBe('AB12CD')
  })

  it('hands the in-flight join request to the lobby page', async () => {
    const { result } = renderHook(() => useJoinLobby(), { wrapper })

    act(() => {
      result.current.joinLobby('AB12CD')
    })

    const pendingJoin = useLobbyStore.getState().pendingJoin
    expect(pendingJoin?.code).toBe('AB12CD')
    expect((await pendingJoin!.request).data).toEqual(mockJoinedLobby)
  })

  describe('the guest account', () => {
    it('is saved as the session after a first join without a token', async () => {
      const { result } = renderHook(() => useJoinLobby(), { wrapper })

      act(() => {
        result.current.joinLobby('AB12CD')
      })
      await useLobbyStore.getState().pendingJoin!.request

      expect(useSessionStore.getState().token).toBe(mockGuestSession.token)
      expect(useSessionStore.getState().account).toEqual(mockGuestSession.account)
    })

    it('is saved before the waiting room sees the response', async () => {
      const { result } = renderHook(() => useJoinLobby(), { wrapper })

      act(() => {
        result.current.joinLobby('AB12CD')
      })
      // What useLobbyState does: wait on the handed-over request.
      await useLobbyStore.getState().pendingJoin!.request.then(() => {
        expect(useSessionStore.getState().account?.id).toBe(mockGuestSession.account.id)
      })
    })

    it('leaves an existing session alone', async () => {
      const existing = { ...mockGuestSession.account, id: 'user-1', isGuest: false }
      useSessionStore.getState().setSession('mock-token', existing)
      const { result } = renderHook(() => useJoinLobby(), { wrapper })

      act(() => {
        result.current.joinLobby('AB12CD')
      })
      await useLobbyStore.getState().pendingJoin!.request

      expect(useSessionStore.getState().token).toBe('mock-token')
      expect(useSessionStore.getState().account).toEqual(existing)
    })

    it('is not created when the join fails', async () => {
      server.use(
        http.post(LOBBY_ENDPOINTS.join(':code'), () =>
          HttpResponse.json({ message: 'Lobby is full' }, { status: 409 }),
        ),
      )
      const { result } = renderHook(() => useJoinLobby(), { wrapper })

      act(() => {
        result.current.joinLobby('AB12CD')
      })
      await useLobbyStore.getState().pendingJoin!.request.catch(() => {})

      expect(useSessionStore.getState().token).toBeNull()
    })
  })

  // Sanitizing/validating the code is JoinLobbyInput's job - this hook passes
  // through whatever it is handed.
  it('passes the code through untouched', () => {
    const { result } = renderHook(() => useJoinLobby(), { wrapper })

    act(() => {
      result.current.joinLobby('ab12cd')
    })

    expect(screen.getByTestId('lobby-probe').textContent).toBe('ab12cd')
    expect(useLobbyStore.getState().pendingJoin?.code).toBe('ab12cd')
  })
})
