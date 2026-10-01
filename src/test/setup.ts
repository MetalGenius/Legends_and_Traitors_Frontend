import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { mockGuestSession } from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'

// Any request without a matching handler fails the test immediately, instead
// of silently attempting a real network call.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// The app always starts a guest session before anything else runs (see
// AppProviders), so tests start as that guest too. Tests about the no-token
// path clear it themselves.
beforeEach(() => {
  const { token, account } = mockGuestSession
  useSessionStore.getState().setSession(token, account)
})

afterEach(() => {
  // Vitest runs without globals, so Testing Library's automatic cleanup never
  // self-registers. Without this, renders accumulate in the same document and
  // queries fail with "found multiple elements".
  cleanup()
  // Drop per-test `server.use()` overrides so a failure case can't leak into
  // the next test.
  server.resetHandlers()
  // The session store persists here; don't let it leak into the next test.
  localStorage.clear()
})

afterAll(() => server.close())
