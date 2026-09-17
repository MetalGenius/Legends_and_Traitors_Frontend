import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
})
