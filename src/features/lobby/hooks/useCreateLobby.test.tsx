import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { LOBBY_ENDPOINTS } from '@features/lobby'
import { mockGuestSession, mockHostSession } from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'

import { useCreateLobby } from './useCreateLobby'

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('useCreateLobby', () => {
  it('is not creating and has no error before anything happens', () => {
    const { result } = renderHook(() => useCreateLobby(), { wrapper })

    expect(result.current.isCreating).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('re-enables the button and clears in-flight state after success', async () => {
    const { result } = renderHook(() => useCreateLobby(), { wrapper })

    await act(async () => {
      await result.current.createLobby()
    })

    expect(result.current.isCreating).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it("keeps the guest account the server made for a host with no token", async () => {
    const { result } = renderHook(() => useCreateLobby(), { wrapper })

    await act(async () => {
      await result.current.createLobby()
    })

    expect(useSessionStore.getState().token).toBe(mockHostSession.token)
    expect(useSessionStore.getState().account).toEqual(mockHostSession.account)
  })

  it('leaves an existing session alone', async () => {
    const { token, account } = mockGuestSession
    useSessionStore.getState().setSession(token, account)
    const { result } = renderHook(() => useCreateLobby(), { wrapper })

    await act(async () => {
      await result.current.createLobby()
    })

    expect(useSessionStore.getState().token).toBe(token)
    expect(useSessionStore.getState().account).toEqual(account)
  })

  it('re-enables the button and sets an error message on a 400', async () => {
    server.use(
      http.post(LOBBY_ENDPOINTS.create, () =>
        HttpResponse.json({ message: 'Invalid request' }, { status: 400 }),
      ),
    )

    const { result } = renderHook(() => useCreateLobby(), { wrapper })

    await act(async () => {
      await result.current.createLobby()
    })

    expect(result.current.isCreating).toBe(false)
    expect(result.current.error).toBe('Invalid request')
  })

  it('re-enables the button and sets an error message on a 500', async () => {
    server.use(
      http.post(LOBBY_ENDPOINTS.create, () =>
        HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
      ),
    )

    const { result } = renderHook(() => useCreateLobby(), { wrapper })

    await act(async () => {
      await result.current.createLobby()
    })

    expect(result.current.isCreating).toBe(false)
    expect(result.current.error).toBe('Internal server error')
  })

  it('re-enables the button and sets a generic error message on a network failure', async () => {
    server.use(http.post(LOBBY_ENDPOINTS.create, () => HttpResponse.error()))

    const { result } = renderHook(() => useCreateLobby(), { wrapper })

    await act(async () => {
      await result.current.createLobby()
    })

    expect(result.current.isCreating).toBe(false)
    expect(result.current.error).toMatch(/couldn't reach the server/i)
  })

  it('is in-flight while the request is pending', async () => {
    server.use(
      http.post(LOBBY_ENDPOINTS.create, async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return HttpResponse.json({ message: 'Invalid request' }, { status: 400 })
      }),
    )

    const { result } = renderHook(() => useCreateLobby(), { wrapper })

    let pending!: Promise<void>
    act(() => {
      pending = result.current.createLobby()
    })

    expect(result.current.isCreating).toBe(true)

    await act(async () => {
      await pending
    })

    expect(result.current.isCreating).toBe(false)
  })
})
