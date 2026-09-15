import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from '@mocks/server'

// Any request without a matching handler fails the test immediately, instead
// of silently attempting a real network call.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  // Vitest runs without globals, so Testing Library's automatic cleanup never
  // self-registers. Without this, renders accumulate in the same document and
  // queries fail with "found multiple elements".
  cleanup()
  // Drop per-test `server.use()` overrides so a failure case can't leak into
  // the next test.
  server.resetHandlers()
})

afterAll(() => server.close())
