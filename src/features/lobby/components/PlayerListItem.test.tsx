import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { LobbyPlayer } from '@features/lobby/types/lobby'

import PlayerListItem from './PlayerListItem'

function player(overrides: Partial<LobbyPlayer> = {}): LobbyPlayer {
  return { id: 'p1', username: 'Arthur', isHost: false, isReady: false, ...overrides }
}

describe('PlayerListItem', () => {
  it("renders the player's username", () => {
    render(<PlayerListItem player={player()} />)

    expect(screen.getByText('Arthur')).toBeDefined()
  })

  it('renders the uppercased first initial as the avatar', () => {
    render(<PlayerListItem player={player({ username: 'arthur' })} />)

    expect(screen.getByText('A')).toBeDefined()
  })

  it('ignores leading whitespace when deriving the initial', () => {
    render(<PlayerListItem player={player({ username: '  lancelot' })} />)

    expect(screen.getByText('L')).toBeDefined()
  })

  describe('host crown', () => {
    it('shows the crown for the host', () => {
      render(<PlayerListItem player={player({ isHost: true })} />)

      expect(screen.getByTestId('host-crown')).toBeDefined()
    })

    it('hides the crown for everyone else', () => {
      render(<PlayerListItem player={player({ isHost: false })} />)

      expect(screen.queryByTestId('host-crown')).toBeNull()
    })
  })

  describe('ready status', () => {
    it('shows "Not Ready" when isReady is false', () => {
      render(<PlayerListItem player={player({ isReady: false })} />)

      expect(screen.getByTestId('player-ready-status').textContent).toBe('Not Ready')
    })

    it('shows "Ready" when isReady is true', () => {
      render(<PlayerListItem player={player({ isReady: true })} />)

      expect(screen.getByTestId('player-ready-status').textContent).toBe('Ready')
    })
  })
})
