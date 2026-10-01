import { beforeEach, describe, expect, it } from 'vitest'

import { getAuthHeaders, trackPendingSession, useSessionStore } from './session'

const account = {
  id: 'guest-1',
  username: 'guest_1',
  displayName: 'Guest1',
  isGuest: true,
}

beforeEach(() => {
  useSessionStore.getState().clearSession()
})

describe('getAuthHeaders', () => {
  it('returns a bearer header for the current token', async () => {
    useSessionStore.getState().setSession('abc', account)

    await expect(getAuthHeaders()).resolves.toEqual({ Authorization: 'Bearer abc' })
  })

  it('returns no header when there is no session', async () => {
    await expect(getAuthHeaders()).resolves.toEqual({})
  })

  it('waits for a session that is still being created', async () => {
    let finish!: () => void
    const pending = new Promise<void>((resolve) => {
      finish = () => {
        useSessionStore.getState().setSession('late-token', account)
        resolve()
      }
    })
    trackPendingSession(pending)

    const headers = getAuthHeaders()
    finish()

    await expect(headers).resolves.toEqual({ Authorization: 'Bearer late-token' })
  })

  it('still resolves (without a token) when the pending session fails', async () => {
    const failed = Promise.reject(new Error('no guest for you'))
    trackPendingSession(failed)

    await expect(getAuthHeaders()).resolves.toEqual({})
  })
})
