import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { AUTH_ENDPOINTS } from '@features/auth/api/authService'
import { mockGuest, mockGuestSession, mockGuestToken } from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'

import { ensureGuestSession, useGuestSession } from './useGuestSession'

/** Counts guest requests while still answering them with the mock guest. */
function countGuestRequests() {
  const calls = { count: 0 }
  server.use(
    http.post(AUTH_ENDPOINTS.guest, () => {
      calls.count += 1
      return HttpResponse.json({ token: mockGuestToken, user: mockGuest })
    }),
  )
  return calls
}

// These tests are about the not-logged-in path, so start with no token.
beforeEach(() => {
  useSessionStore.getState().clearSession()
})

describe('ensureGuestSession', () => {
  it('creates and stores a guest session when there is no token', async () => {
    const account = await ensureGuestSession()

    expect(account).toEqual(mockGuestSession.account)
    expect(useSessionStore.getState().token).toBe(mockGuestToken)
    expect(useSessionStore.getState().account).toEqual(mockGuestSession.account)
  })

  it('keeps an existing session instead of minting a new guest', async () => {
    const existing = { ...mockGuestSession.account, id: 'someone-else' }
    useSessionStore.getState().setSession('existing-token', existing)
    const calls = countGuestRequests()

    await expect(ensureGuestSession()).resolves.toEqual(existing)
    expect(calls.count).toBe(0)
    expect(useSessionStore.getState().token).toBe('existing-token')
  })

  it('makes only one request when called again while it is in flight', async () => {
    const calls = countGuestRequests()

    await Promise.all([ensureGuestSession(), ensureGuestSession()])

    expect(calls.count).toBe(1)
  })

  it('leaves the app without a session if the guest request fails', async () => {
    server.use(
      http.post(AUTH_ENDPOINTS.guest, () =>
        HttpResponse.json({ message: 'Nope' }, { status: 500 }),
      ),
    )

    await expect(ensureGuestSession()).rejects.toMatchObject({ status: 500 })
    expect(useSessionStore.getState().token).toBeNull()
  })

  it('tries again on the next call after a failure', async () => {
    server.use(
      http.post(AUTH_ENDPOINTS.guest, () => HttpResponse.error(), { once: true }),
    )

    await expect(ensureGuestSession()).rejects.toBeDefined()
    await expect(ensureGuestSession()).resolves.toEqual(mockGuestSession.account)
  })
})

describe('useGuestSession', () => {
  it('starts with no account, then has the guest once the request lands', async () => {
    const { result } = renderHook(() => useGuestSession())

    expect(result.current.account).toBeNull()
    await waitFor(() => {
      expect(result.current.account).toEqual(mockGuestSession.account)
    })
  })

  it('persists the session so a reload keeps the same guest', async () => {
    renderHook(() => useGuestSession())

    await waitFor(() => {
      expect(useSessionStore.getState().token).toBe(mockGuestToken)
    })
    const stored = JSON.parse(localStorage.getItem('lt-session') ?? '{}')
    expect(stored.state).toMatchObject({
      token: mockGuestToken,
      account: mockGuestSession.account,
    })
  })
})
