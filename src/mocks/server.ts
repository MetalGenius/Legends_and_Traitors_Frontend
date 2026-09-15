import { setupServer } from 'msw/node'

import { handlers } from './handlers'

// Node build of MSW: intercepts requests inside the Vitest process itself.
// Not for the browser - that would need `setupWorker` from `msw/browser`.
export const server = setupServer(...handlers)
