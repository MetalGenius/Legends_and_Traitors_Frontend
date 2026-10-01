import { beforeEach, describe, expect, it } from 'vitest'

import { authHeaders, useSessionStore } from './session'

const account = {
  id: 'guest-1',
  username: 'guest_1',
  displayName: 'Guest1',
  isGuest: true,
}

beforeEach(() => {
  useSessionStore.getState().clearSession()
})

describe('session', () => {
  it('starts with no session', () => {
    expect(useSessionStore.getState().token).toBeNull()
    expect(useSessionStore.getState().account).toBeNull()
  })

  it('persists the session so a reload keeps the same account', () => {
    useSessionStore.getState().setSession('abc', account)

    const stored = JSON.parse(localStorage.getItem('lt-session') ?? '{}')
    expect(stored.state).toEqual({ token: 'abc', account })
  })
})

describe('authHeaders', () => {
  it('returns a bearer header for the current token', () => {
    useSessionStore.getState().setSession('abc', account)

    expect(authHeaders()).toEqual({ Authorization: 'Bearer abc' })
  })

  it('returns no header when there is no session', () => {
    expect(authHeaders()).toEqual({})
  })
})
