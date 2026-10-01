import type { ReactNode } from 'react'

import { useGuestSession } from '@features/auth'

/**
 * The single place application-wide providers get stacked - query client,
 * router, theme, auth session, socket connection. Keeping them here means a
 * feature never has to reach up into the app layer to find its context.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  // Not logged in? Start as a guest, so lobby calls always carry a token.
  useGuestSession()

  return <>{children}</>
}
