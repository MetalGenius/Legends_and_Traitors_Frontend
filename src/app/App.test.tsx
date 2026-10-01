import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockGuestSession } from '@mocks/handlers'
import { useSessionStore } from '@shared/lib/session'

import { App } from './App'

describe('App', () => {
  it('renders the landing screen inside the provider stack', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: /login/i })).toBeDefined()
  })

  it('starts a guest session when there is no token', async () => {
    useSessionStore.getState().clearSession()

    render(<App />)

    await waitFor(() => {
      expect(useSessionStore.getState().token).toBe(mockGuestSession.token)
    })
    expect(useSessionStore.getState().account).toEqual(mockGuestSession.account)
  })
})
