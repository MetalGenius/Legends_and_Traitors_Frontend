/**
 * Route table. Once a router library is added, each route lazy-imports a
 * feature's entry component from its public barrel:
 *
 *   const Lobby = lazy(() => import('@features/lobby').then(m => ({ default: m.LobbyPage })))
 *
 * This file is the only one that knows which features exist.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomeScreen from '../layouts/CreateHomeScreen'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/join/:code" element={<HomeScreen />} />
      </Routes>
    </BrowserRouter>
  )
}
