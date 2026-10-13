import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { resetMockLobbies } from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'
import { resetSocketForTests } from '@shared/lib/socket'

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
  // Close any live-update connection a test opened, then reset the mock
  // server's lobbies (joins and ready toggles change them) and rooms.
  resetSocketForTests()
  resetMockLobbies()
  // The session store persists here; don't let it leak into the next test.
  localStorage.clear()
})

afterAll(() => server.close())
