import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LOBBY_ENDPOINTS, useLobbyStore, type LobbyData } from '@features/lobby'
import { mockLobby } from '@mocks/handlers'
import { server } from '@mocks/server'

import LobbyRoom from './LobbyRoom'

/** Renders the lobby at /lobby/AB12CD, with Home as the redirect target. */
function renderLobby(props = {}, code = 'AB12CD') {
  return render(
    <MemoryRouter initialEntries={[`/lobby/${code}`]}>
      <Routes>
        <Route path="/lobby/:code" element={<LobbyRoom {...props} />} />
        <Route path="/" element={<div>Home screen</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Makes the GET for `code` return this lobby instead of the default. */
function serveLobby(lobby: LobbyData) {
  server.use(
    http.get(LOBBY_ENDPOINTS.detail(':code'), () =>
      HttpResponse.json({ status: 'SUCCESS', data: lobby }),
    ),
  )
}

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
  // Module-level singleton shared across tests - reset between them.
  useLobbyStore.getState().clearLobby()
})

describe('LobbyRoom', () => {
  it('shows a loading state while the lobby is being fetched', () => {
    renderLobby()

    expect(screen.getByTestId('lobby-loading')).toBeDefined()
  })

  it('shows the fetched lobby once loading finishes', async () => {
    renderLobby()

    expect(await screen.findByText('AB12CD')).toBeDefined()
    expect(screen.queryByTestId('lobby-loading')).toBeNull()
  })

  it('shows the player count from the server, not a placeholder', async () => {
    serveLobby({
      ...mockLobby,
      maxPlayers: 6,
      players: [
        { id: '1', name: 'Arthur', isHost: true, isReady: false },
        { id: '2', name: 'Lancelot', isHost: false, isReady: true },
      ],
    })

    renderLobby()

    expect(await screen.findByText('Player (2/6)')).toBeDefined()
  })

  it("renders a card per player, with the host's crown", async () => {
    serveLobby({
      ...mockLobby,
      players: [
        { id: '1', name: 'Arthur', isHost: true, isReady: false },
        { id: '2', name: 'Lancelot', isHost: false, isReady: true },
      ],
    })

    renderLobby()

    expect(await screen.findByText('Arthur')).toBeDefined()
    expect(screen.getByText('Lancelot')).toBeDefined()
    expect(screen.getAllByTestId('host-crown')).toHaveLength(1)
  })

  it("copies an invite link built from this app's own origin", async () => {
    renderLobby()

    fireEvent.click(await screen.findByTitle('Click to copy invite link'))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/lobby/AB12CD`,
    )
    expect(await screen.findByText('Copied!')).toBeDefined()
  })

  it('calls onStartGame when Start Game is clicked', async () => {
    const onStartGame = vi.fn()
    renderLobby({ onStartGame })

    fireEvent.click(await screen.findByText('Start Game'))

    expect(onStartGame).toHaveBeenCalledTimes(1)
  })

  it('calls onLeaveGame when Leave Game is clicked', async () => {
    const onLeaveGame = vi.fn()
    renderLobby({ onLeaveGame })

    fireEvent.click(await screen.findByText('Leave Game'))

    expect(onLeaveGame).toHaveBeenCalledTimes(1)
  })

  describe('when the lobby cannot be loaded', () => {
    it('redirects Home on a 404 instead of staying stuck loading', async () => {
      // ZZ99ZZ isn't the mock lobby, so the default handler 404s it.
      renderLobby({}, 'ZZ99ZZ')

      expect(await screen.findByText('Home screen')).toBeDefined()
      expect(screen.queryByTestId('lobby-loading')).toBeNull()
    })

    it('redirects Home on a network failure too', async () => {
      server.use(http.get(LOBBY_ENDPOINTS.detail(':code'), () => HttpResponse.error()))

      renderLobby()

      expect(await screen.findByText('Home screen')).toBeDefined()
      expect(screen.queryByTestId('lobby-loading')).toBeNull()
    })

    it('redirects Home on a server error too', async () => {
      server.use(
        http.get(LOBBY_ENDPOINTS.detail(':code'), () =>
          HttpResponse.json({ message: 'Boom' }, { status: 500 }),
        ),
      )

      renderLobby()

      expect(await screen.findByText('Home screen')).toBeDefined()
    })

    it('leaves no stale lobby behind in the store', async () => {
      useLobbyStore.getState().setLobby(mockLobby)

      renderLobby({}, 'ZZ99ZZ')

      await screen.findByText('Home screen')
      await waitFor(() => {
        expect(useLobbyStore.getState().lobby).toBeNull()
      })
    })
  })
})
