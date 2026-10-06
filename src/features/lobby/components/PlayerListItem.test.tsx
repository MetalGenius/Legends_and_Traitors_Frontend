import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

  describe('own-card indicator', () => {
    it("shows the current player's name in gold, with no extra border", () => {
      render(<PlayerListItem player={player()} isCurrentUser onToggleReady={() => {}} />)

      expect(screen.getByTestId('player-name').className).toContain('text-[#b7791f]')
      expect(screen.getByRole('switch').className).not.toMatch(/(^|\s)ring-/)
    })

    it("keeps everyone else's name black", () => {
      render(<PlayerListItem player={player()} />)

      expect(screen.getByTestId('player-name').className).toContain('text-black')
    })
  })

  describe('ready toggle', () => {
    it("makes the current player's own card a switch for their ready state", () => {
      render(
        <PlayerListItem player={player({ isReady: true })} isCurrentUser onToggleReady={() => {}} />,
      )

      const card = screen.getByRole('switch', { name: 'Ready' })
      expect(card.getAttribute('aria-checked')).toBe('true')
      // The card still shows everything a card shows.
      expect(card.textContent).toContain('Arthur')
      expect(screen.getByTestId('player-ready-status').textContent).toBe('Ready')
    })

    it('calls onToggleReady when the own card is pressed', () => {
      const onToggleReady = vi.fn()
      render(<PlayerListItem player={player()} isCurrentUser onToggleReady={onToggleReady} />)

      fireEvent.click(screen.getByRole('switch'))

      expect(onToggleReady).toHaveBeenCalledTimes(1)
    })

    it('ignores presses while a change is being saved', () => {
      const onToggleReady = vi.fn()
      render(
        <PlayerListItem
          player={player()}
          isCurrentUser
          onToggleReady={onToggleReady}
          isSavingReady
        />,
      )

      const card = screen.getByRole('switch')
      fireEvent.click(card)

      expect(onToggleReady).not.toHaveBeenCalled()
      expect(card.getAttribute('aria-busy')).toBe('true')
    })

    it("leaves another player's card as a plain card, even with a handler", () => {
      render(<PlayerListItem player={player()} onToggleReady={() => {}} />)

      expect(screen.queryByRole('switch')).toBeNull()
      expect(screen.queryByRole('button')).toBeNull()
      expect(screen.getByTestId('player-ready-status').textContent).toBe('Not Ready')
    })

    it('leaves the own card plain when there is nothing to call', () => {
      render(<PlayerListItem player={player()} isCurrentUser />)

      expect(screen.queryByRole('switch')).toBeNull()
    })
  })
})
