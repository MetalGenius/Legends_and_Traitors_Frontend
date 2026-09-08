/**
 * Route table. Once a router library is added, each route lazy-imports a
 * feature's entry component from its public barrel:
 *
 *   const Lobby = lazy(() => import('@features/lobby').then(m => ({ default: m.LobbyPage })))
 *
 * This file is the only one that knows which features exist.
 */
export function AppRouter() {
  return (
    <main className="app-shell">
      <h1>Legends &amp; Traitors</h1>
      <p>Feature-based scaffold is up. Add your first route in src/app/router.</p>
    </main>
  )
}
