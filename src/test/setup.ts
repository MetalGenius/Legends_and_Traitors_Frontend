import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'

// Any request without a matching handler fails the test immediately, instead
// of silently attempting a real network call.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Every test starts as a first-time visitor: no token until they log in or
// join a lobby (which creates a guest). The store is a module singleton.
beforeEach(() => {
  useSessionStore.getState().clearSession()
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
