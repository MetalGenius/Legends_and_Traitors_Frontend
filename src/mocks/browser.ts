import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

// Browser build of MSW: intercepts requests made from the actual running
// app (dev server), not just inside tests. Only started in main.tsx when
// running in dev mode.
export const worker = setupWorker(...handlers)
