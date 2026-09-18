import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLobbyStore } from '@features/lobby'

import LobbyRoom from './LobbyRoom'

function renderLobby(props: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter initialEntries={['/lobby/AB12CD']}>
      <Routes>
        <Route path="/lobby/:code" element={<LobbyRoom {...props} />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
  // The lobby store is a module-level singleton shared across tests - reset
  // it so a previous test's created lobby can't leak into this one.
  useLobbyStore.getState().clearLobby()
})

describe('LobbyRoom', () => {
  it('shows the room code from the URL', () => {
    renderLobby()

    expect(screen.getByText('AB12CD')).toBeDefined()
  })

  it('shows the player count against maxPlayers', () => {
    renderLobby({
      maxPlayers: 6,
      players: [
        { id: '1', name: 'Arthur' },
        { id: '2', name: 'Lancelot' },
      ],
    })

    expect(screen.getByText('Player (2/6)')).toBeDefined()
  })

  it("renders each player's name", () => {
    renderLobby({
      players: [
        { id: '1', name: 'Arthur' },
        { id: '2', name: 'Lancelot' },
      ],
    })

    expect(screen.getByText('Arthur')).toBeDefined()
    expect(screen.getByText('Lancelot')).toBeDefined()
  })

  it('shows the crown only on the host', () => {
    renderLobby({
      players: [
        { id: '1', name: 'Arthur', isHost: true },
        { id: '2', name: 'Lancelot' },
      ],
    })

    expect(screen.getAllByTestId('host-crown')).toHaveLength(1)
  })

  it('copies the invite link and shows confirmation', async () => {
    renderLobby()

    const inviteButton = screen.getByTitle('Click to copy invite link')
    fireEvent.click(inviteButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/lobby/AB12CD`,
    )
    expect(await screen.findByText('Copied!')).toBeDefined()
  })

  it("copies this app's own origin, not the server's lobbyUrl domain", async () => {
    useLobbyStore.getState().setLobby({
      lobbyCode: 'AB12CD',
      lobbyUrl: 'https://app.com/lobby/AB12CD',
      hostId: 'host-1',
      maxPlayers: 8,
      players: [{ id: 'host-1', name: 'HostName', isHost: true, isReady: false }],
    })

    renderLobby()

    fireEvent.click(screen.getByTitle('Click to copy invite link'))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/lobby/AB12CD`,
    )
  })

  it('calls onStartGame when Start Game is clicked', () => {
    const onStartGame = vi.fn()
    renderLobby({ onStartGame })

    fireEvent.click(screen.getByText('Start Game'))

    expect(onStartGame).toHaveBeenCalledTimes(1)
  })

  it('calls onLeaveGame when Leave Game is clicked', () => {
    const onLeaveGame = vi.fn()
    renderLobby({ onLeaveGame })

    fireEvent.click(screen.getByText('Leave Game'))

    expect(onLeaveGame).toHaveBeenCalledTimes(1)
  })

  it('shows the real lobby from the store instead of the prop defaults, when one exists', () => {
    useLobbyStore.getState().setLobby({
      lobbyCode: 'AB12CD',
      lobbyUrl: 'https://app.com/lobby/AB12CD',
      hostId: 'host-1',
      maxPlayers: 8,
      players: [{ id: 'host-1', name: 'HostName', isHost: true, isReady: false }],
    })

    // Passed props should be ignored once the store has real data.
    renderLobby({
      maxPlayers: 10,
      players: [
        { id: '1', name: 'Player 1' },
        { id: '2', name: 'Player 1' },
      ],
    })

    expect(screen.getByText('Player (1/8)')).toBeDefined()
    expect(screen.getByText('HostName')).toBeDefined()
    expect(screen.queryByText('Player 1')).toBeNull()
  })
})
