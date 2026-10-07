import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  LOBBY_ENDPOINTS,
  useLobbyStore,
  usePlayerStore,
  type LobbyData,
} from '@features/lobby'
import {
  mockGuest,
  mockGuestSession,
  mockHostSession,
  mockJoinedLobby,
  mockLobby,
} from '@mocks/handlers'
import { server } from '@mocks/server'
import { MAX_PLAYERS } from '@shared/config/game'
import { useSessionStore } from '@shared/lib/session'

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

/** The "Player (n/max)" heading LobbyRoom shows for this lobby. */
function playerCount(lobby: LobbyData) {
  return `Player (${lobby.players.length}/${MAX_PLAYERS})`
}

/**
 * Waits for the room to finish getting in (or redirect). Every test must: an
 * unfinished request for the same code would be reused by the next test.
 */
async function settle() {
  await waitFor(() => {
    expect(screen.queryByTestId('lobby-loading')).toBeNull()
  })
}

/** Makes the lobby endpoints (load and join) return this lobby instead. */
function serveLobby(lobby: LobbyData) {
  const body = { status: 'SUCCESS', data: lobby }
  server.use(
    http.get(LOBBY_ENDPOINTS.detail(':code'), () => HttpResponse.json(body)),
    http.post(LOBBY_ENDPOINTS.join(':code'), () => HttpResponse.json(body)),
  )
}

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
  // Module-level singleton shared across tests - reset between them.
  useLobbyStore.getState().clearLobby()
  useLobbyStore.getState().setJoiningCode(null)
  usePlayerStore.getState().clearPlayer()
  // Most of these tests are about the room itself, viewed by its host - who
  // is already a player, so arriving just loads it.
  const { token, account } = mockHostSession
  useSessionStore.getState().setSession(token, account)
})

describe('LobbyRoom', () => {
  it('shows a loading state while the lobby is being fetched', async () => {
    renderLobby()

    expect(screen.getByTestId('lobby-loading')).toBeDefined()
    await settle()
  })

  it('shows a joining state until the join succeeds, then the joined players', async () => {
    // A first-time visitor arriving by invite link (or a typed code).
    useSessionStore.getState().clearSession()

    renderLobby()

    expect(screen.getByTestId('lobby-loading').textContent).toBe('Joining lobby...')
    expect(await screen.findByText(playerCount(mockJoinedLobby))).toBeDefined()
    expect(screen.queryByTestId('lobby-loading')).toBeNull()
    expect(screen.getByText('HostName')).toBeDefined()
    // The guest's own card, alongside the host's.
    expect(screen.getAllByText(mockGuest.displayName).length).toBeGreaterThan(0)
    expect(useLobbyStore.getState().lobby).toEqual(mockJoinedLobby)
  })

  it('just loads the lobby for someone already in it', async () => {
    renderLobby()

    expect(screen.getByTestId('lobby-loading').textContent).toBe('Loading lobby...')
    await settle()
  })

  it('shows the fetched lobby once loading finishes', async () => {
    renderLobby()

    expect(await screen.findByText('AB12CD')).toBeDefined()
    expect(screen.queryByTestId('lobby-loading')).toBeNull()
  })

  it('shows how many of the fixed seats are taken, from the real player list', async () => {
    serveLobby({
      ...mockLobby,
      players: [
        { id: '1', username: 'Arthur', isHost: true, isReady: false },
        { id: '2', username: 'Lancelot', isHost: false, isReady: true },
        { id: '3', username: 'Gawain', isHost: false, isReady: true },
      ],
    })

    renderLobby()

    expect(await screen.findByText(`Player (3/${MAX_PLAYERS})`)).toBeDefined()
  })

  it('ignores a different maximum if the server still sends one', async () => {
    // An older backend might keep sending a per-lobby size; the rule wins.
    serveLobby({ ...mockLobby, maxPlayers: 4 } as LobbyData)

    renderLobby()

    expect(await screen.findByText(playerCount(mockLobby))).toBeDefined()
    expect(screen.queryByText(`Player (${mockLobby.players.length}/4)`)).toBeNull()
  })

  it("renders a card per player, with the host's crown", async () => {
    serveLobby({
      ...mockLobby,
      players: [
        { id: '1', username: 'Arthur', isHost: true, isReady: false },
        { id: '2', username: 'Lancelot', isHost: false, isReady: true },
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

  describe('header name', () => {
    beforeEach(() => {
      const { token, account } = mockGuestSession
      useSessionStore.getState().setSession(token, account)
    })

    it("shows the account's display name, not its username", async () => {
      renderLobby()

      const header = screen.getByTestId('header-display-name')
      expect(header.textContent).toBe(mockGuest.displayName)
      expect(header.textContent).not.toBe(mockGuest.username)
      await settle()
    })

    it('switches to the name the lobby knows us by once we have joined', async () => {
      // The server may show us differently from our account's display name.
      serveLobby({
        ...mockLobby,
        players: [
          ...mockLobby.players,
          { id: mockGuest.id, username: 'Sir Guest', isHost: false, isReady: false },
        ],
      })

      renderLobby()

      const header = screen.getByTestId('header-display-name')
      await waitFor(() => {
        expect(header.textContent).toBe('Sir Guest')
      })
      expect(usePlayerStore.getState().displayName).toBe('Sir Guest')
    })

    it('is empty rather than a placeholder before any session exists', async () => {
      useSessionStore.getState().clearSession()

      renderLobby()

      expect(within(screen.getByRole('banner')).getByTestId('header-display-name').textContent).toBe('')
      await settle()
    })
  })

  describe('ready toggle', () => {
    // The mock lobby (the signed-in host among them) plus a ready guest.
    const lobbyWithGuest: LobbyData = {
      ...mockLobby,
      players: [
        ...mockLobby.players,
        { id: mockGuest.id, username: mockGuest.displayName, isHost: false, isReady: true },
      ],
    }

    it("is only the current player's own card", async () => {
      serveLobby(lobbyWithGuest)
      renderLobby()

      await screen.findByText(playerCount(lobbyWithGuest))
      const toggles = screen.getAllByRole('switch')
      expect(toggles).toHaveLength(1)
      expect(toggles[0].textContent).toContain('HostName')
      expect(toggles[0].getAttribute('aria-checked')).toBe('false')
      // Every card still shows its status; the other player's can't be pressed.
      const statuses = screen.getAllByTestId('player-ready-status')
      expect(statuses.map((status) => status.textContent)).toEqual(
        lobbyWithGuest.players.map((p) => (p.isReady ? 'Ready' : 'Not Ready')),
      )
    })

    it('flips instantly when pressed, and stays flipped once saved', async () => {
      renderLobby()
      const toggle = await screen.findByRole('switch')

      fireEvent.click(toggle)

      expect(toggle.getAttribute('aria-checked')).toBe('true')
      expect(within(toggle).getByTestId('player-ready-status').textContent).toBe('Ready')
      await waitFor(() => {
        expect(toggle.getAttribute('aria-busy')).toBe('false')
      })
      expect(toggle.getAttribute('aria-checked')).toBe('true')
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it("flips back and shows the server's message when saving fails", async () => {
      server.use(
        http.patch(LOBBY_ENDPOINTS.ready(':code'), () =>
          HttpResponse.json({ message: 'The game is starting' }, { status: 409 }),
        ),
      )
      renderLobby()
      const toggle = await screen.findByRole('switch')

      fireEvent.click(toggle)

      expect(toggle.getAttribute('aria-checked')).toBe('true')
      expect((await screen.findByRole('alert')).textContent).toBe('The game is starting')
      expect(toggle.getAttribute('aria-checked')).toBe('false')
    })
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
