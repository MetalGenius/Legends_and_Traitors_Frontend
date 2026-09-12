/**
 * Route table. Once a router library is added, each route lazy-imports a
 * feature's entry component from its public barrel:
 *
 *   const Lobby = lazy(() => import('@features/lobby').then(m => ({ default: m.LobbyPage })))
 *
 * This file is the only one that knows which features exist.
 */
import CreateHomeScreen from '@app/layouts/CreateHomeScreen'

export function AppRouter() {
  return <CreateHomeScreen />
}
